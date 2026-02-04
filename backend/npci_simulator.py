import random
import time
from datetime import datetime

class NPCISimulator:
    def __init__(self):
        # Complete 20-error code system
        self.status_codes = {
            'SUCCESS': '00',
            # Receiver Bank Errors
            'U28': 'U28', 'U20': 'U20', 'U13': 'U13', 'U14': 'U14', 'U18': 'U18',
            # Sender Bank Errors  
            'S05': 'S05', 'S10': 'S10', 'S22': 'S22', 'S31': 'S31',
            # NPCI/Payment Switch Errors
            'R05': 'R05', 'R10': 'R10', 'R13': 'R13', 'R30': 'R30',
            # Network/Timeout Errors
            'T01': 'T01', 'T05': 'T05', 'T06': 'T06',
            # Customer Input Errors
            'C01': 'C01', 'C02': 'C02', 'C03': 'C03', 'C05': 'C05'
        }
        
        # Banking-accurate error separation
        self.pre_debit_errors = ['C01', 'C02', 'C03', 'C05', 'S10', 'U14', 'U28', 'R05', 'R10']
        self.post_debit_errors = ['S31', 'U20', 'T01', 'U18', 'S05', 'T06', 'S22', 'R30', 'U13', 'T05', 'R13']
        self.txn_cache = set()

    def _get_db_connection(self):
        import mysql.connector
        return mysql.connector.connect(
            host='localhost',
            user='root',
            password='root',
            database='banksecure'
        )

    def process_transaction(self, user_id, receiver_account, amount, receiver_name):
        """Main NPCI transaction processing"""
        
        txn_id = f"TXN{int(time.time())}{random.randint(100, 999)}"
        
        # Step 1: Validate sender account
        sender_validation = self._validate_sender_account(user_id, amount)
        if sender_validation['status'] != 'SUCCESS':
            return self._create_response(txn_id, sender_validation['status'], sender_validation['message'])
        
        # Step 2: Validate receiver account
        receiver_validation = self._validate_receiver_account(receiver_account, receiver_name)
        if receiver_validation['status'] != 'SUCCESS':
            self._save_failed_transaction(user_id, txn_id, amount, receiver_account, receiver_validation['status'], receiver_validation['message'])
            return self._create_response(txn_id, receiver_validation['status'], receiver_validation['message'])
        
        # Step 3: Execute transfer
        return self._execute_transfer(user_id, receiver_account, amount, receiver_validation.get('type', 'external'), txn_id)

    def _validate_sender_account(self, user_id, amount):
        """Validate sender account and funds"""
        
        conn = self._get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        try:
            cursor.execute('SELECT balance FROM accounts WHERE user_id = %s', (user_id,))
            account_data = cursor.fetchone()
            
            if not account_data:
                return {'status': 'C02', 'message': 'Sender account not found'}
            
            current_balance = float(account_data['balance'])
            
            if amount > current_balance:
                return {'status': 'S10', 'message': 'Insufficient balance'}
            
            if amount > 25000:
                return {'status': 'R05', 'message': 'Daily transaction limit exceeded'}
            
            return {'status': 'SUCCESS', 'message': 'Sender validation passed'}
        
        finally:
            conn.close()

    def _validate_receiver_account(self, account, name):
        """PRE-DEBIT validation"""
        
        # Customer input validation
        if '@' in account and (len(account) < 6 or not self._valid_upi_format(account)):
            return {'status': 'C01', 'message': 'Invalid UPI ID format'}
        
        if account.isdigit() and len(account) < 10:
            return {'status': 'C02', 'message': 'Invalid account number'}
        
        if random.random() < 0.001:
            return {'status': 'C05', 'message': 'Transaction cancelled by user'}
        
        if random.random() < 0.02:
            return {'status': 'R05', 'message': 'Transaction rejected by payment network'}
        
        if random.random() < 0.01:
            return {'status': 'R10', 'message': 'Duplicate transaction detected'}
        
        conn = self._get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        try:
            # Check internal accounts
            cursor.execute('SELECT u.full_name FROM accounts a JOIN users u ON a.user_id = u.id WHERE a.account_number = %s', (account,))
            internal_account = cursor.fetchone()
            
            if internal_account:
                if internal_account['full_name'].lower() != name.lower():
                    return {'status': 'U14', 'message': 'Account holder name does not match'}
                return {'status': 'SUCCESS', 'message': 'Internal receiver account found', 'type': 'internal'}
            
            # Check external accounts
            cursor.execute('SELECT account_holder_name, status, balance FROM external_accounts WHERE account_number = %s', (account,))
            external_account = cursor.fetchone()
            
            if not external_account:
                return {'status': 'U14', 'message': 'Receiver account not found'}
            
            # Handle different account statuses
            if external_account['status'] == 'blocked':
                return {'status': 'U20', 'message': 'Receiver account is blocked'}
            elif external_account['status'] == 'inactive':
                return {'status': 'U28', 'message': 'Receiver account is inactive'}
            
            if external_account['account_holder_name'].lower() != name.lower():
                return {'status': 'U14', 'message': 'Account holder name does not match'}
            
            return {'status': 'SUCCESS', 'message': 'External receiver account found', 'type': 'external'}
        
        finally:
            conn.close()
    
    def _valid_upi_format(self, upi_id):
        """Validate UPI ID format"""
        return '@' in upi_id and len(upi_id.split('@')) == 2

    def _execute_transfer(self, user_id, receiver_account, amount, receiver_type, txn_id):
        """Execute transfer with debit/credit"""
        
        conn = self._get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        try:
            # Debit sender account
            cursor.execute('SELECT id, balance, account_number FROM accounts WHERE user_id = %s', (user_id,))
            sender_data = cursor.fetchone()
            
            if not sender_data:
                return self._create_response(txn_id, 'C02', 'Sender account not found')
            
            new_sender_balance = float(sender_data['balance']) - amount
            cursor.execute('UPDATE accounts SET balance = %s WHERE user_id = %s', (new_sender_balance, user_id))
            
            # Record debit transaction
            print(f"Recording transaction: {txn_id} for user {user_id}")
            try:
                cursor.execute(
                    '''INSERT INTO transactions (account_id, transaction_type, amount, before_balance, balance_after, 
                       transaction_id, description, status, created_at) 
                       VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW())''',
                    (sender_data['id'], 'transfer', amount, sender_data['balance'], new_sender_balance, 
                     txn_id, f'Transfer to {receiver_account}', 'pending')
                )
                print(f"Transaction recorded successfully: {txn_id}")
            except Exception as insert_error:
                print(f"Failed to insert transaction: {insert_error}")
                raise insert_error
            
            conn.commit()
            
            # Post-debit failure simulation (80% failure rate)
            error_code = self._assign_post_debit_error(amount, user_id)
            
            if error_code:
                status = 'pending' if error_code in ['U13', 'R30', 'T05'] else 'failed'
                cursor.execute('UPDATE transactions SET status = %s, error_code = %s WHERE transaction_id = %s', 
                             (status, error_code, txn_id))
                conn.commit()
                return self._create_response(txn_id, error_code, self._get_error_message(error_code))
            
            # Success - credit receiver
            if receiver_type == 'internal':
                cursor.execute('SELECT id, balance FROM accounts WHERE account_number = %s', (receiver_account,))
                receiver_data = cursor.fetchone()
                
                new_receiver_balance = float(receiver_data['balance']) + amount
                cursor.execute('UPDATE accounts SET balance = %s WHERE account_number = %s', (new_receiver_balance, receiver_account))
                
                cursor.execute(
                    '''INSERT INTO transactions (account_id, transaction_type, amount, before_balance, balance_after, 
                       transaction_id, description, status, created_at) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW())''',
                    (receiver_data['id'], 'credit', amount, receiver_data['balance'], new_receiver_balance, 
                     txn_id, f'Transfer from {sender_data["account_number"]}', 'completed')
                )
            else:
                cursor.execute('SELECT balance FROM external_accounts WHERE account_number = %s', (receiver_account,))
                ext_receiver_data = cursor.fetchone()
                
                new_ext_balance = float(ext_receiver_data['balance']) + amount
                cursor.execute('UPDATE external_accounts SET balance = %s WHERE account_number = %s', (new_ext_balance, receiver_account))
            
            cursor.execute('UPDATE transactions SET status = "completed" WHERE transaction_id = %s', (txn_id,))
            conn.commit()
            
            return self._create_response(txn_id, 'SUCCESS', 'Transaction completed successfully')
        
        except Exception as e:
            print(f"Exception in transfer: {e}")
            conn.rollback()
            # Still try to record the failed transaction with balance info
            try:
                cursor.execute('SELECT id, balance FROM accounts WHERE user_id = %s', (user_id,))
                current_account = cursor.fetchone()
                if current_account:
                    before_balance = float(current_account['balance']) + amount  # Original balance before debit
                    after_balance = float(current_account['balance'])  # Current balance after debit
                    
                    cursor.execute(
                        '''INSERT INTO transactions (account_id, transaction_type, amount, before_balance, balance_after,
                           transaction_id, description, status, error_code, created_at) 
                           VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())''',
                        (current_account['id'], 'transfer', amount, before_balance, after_balance, txn_id, 
                         f'Failed transfer to {receiver_account}', 'failed', 'S22')
                    )
                    conn.commit()
                    print(f"Failed transaction recorded with balances: {txn_id}")
            except Exception as e2:
                print(f"Failed to record failed transaction: {e2}")
            return self._create_response(txn_id, 'S22', 'System failure after debit')
        finally:
            conn.close()

    def _assign_post_debit_error(self, amount, user_id):
        """POST-DEBIT failures only"""
        
        if random.random() < 0.20:  # 20% success
            return None
        
        post_debit_errors = {
            'S31': 15, 'U20': 20, 'T01': 15, 'U18': 10, 'S05': 8, 'T06': 7, 'S22': 5,
            'R30': 8, 'U13': 6, 'T05': 4, 'R13': 2
        }
        
        current_hour = datetime.now().hour
        if 23 <= current_hour or current_hour <= 6:
            return self._weighted_choice(['S22', 'R30', 'U13'], [0.5, 0.3, 0.2])
        
        if amount > 50000:
            return self._weighted_choice(['S31', 'U18', 'S22'], [0.5, 0.3, 0.2])
        
        errors = list(post_debit_errors.keys())
        weights = list(post_debit_errors.values())
        return self._weighted_choice(errors, weights)
    
    def _weighted_choice(self, choices, weights):
        """Select random choice based on weights"""
        total = sum(weights)
        r = random.uniform(0, total)
        upto = 0
        for choice, weight in zip(choices, weights):
            if upto + weight >= r:
                return choice
            upto += weight
        return choices[-1]
    
    def _get_error_message(self, error_code):
        """Get user-friendly error message"""
        messages = {
            'U28': 'Receiver bank is temporarily unavailable. Amount will be refunded.',
            'U20': 'Bank response delayed. Refund initiated.',
            'U13': 'Transaction delayed due to bank network issue.',
            'U14': 'Invalid receiver details. Please check and retry.',
            'U18': 'Receiver bank technical issue. Refund initiated.',
            'S05': 'Transaction timed out. Refund initiated.',
            'S10': 'Insufficient balance.',
            'S22': 'System issue. Transaction will be reversed if not completed.',
            'S31': 'Amount temporarily debited. Reversal in progress.',
            'R05': 'Transaction rejected by payment network.',
            'R10': 'Duplicate transaction detected.',
            'R13': 'Unable to reach receiver bank.',
            'R30': 'Payment network down. Refund if not completed.',
            'T01': 'Network error occurred. Refund initiated.',
            'T05': 'Transaction delayed due to network.',
            'T06': 'Bank not responding. Refund initiated.',
            'C01': 'Invalid UPI ID.',
            'C02': 'Invalid account number.',
            'C03': 'Invalid IFSC code.',
            'C05': 'Transaction cancelled by you.'
        }
        return messages.get(error_code, 'Transaction failed')
    
    def _save_failed_transaction(self, user_id, txn_id, amount, receiver_account, error_code, message):
        """Save failed transaction record"""
        conn = self._get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        try:
            cursor.execute('SELECT id FROM accounts WHERE user_id = %s', (user_id,))
            account_data = cursor.fetchone()
            
            if account_data:
                cursor.execute(
                    '''INSERT INTO transactions (account_id, transaction_type, amount, transaction_id, 
                       description, status, error_code, created_at) VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())''',
                    (account_data['id'], 'failed_transfer', amount, txn_id, 
                     f'Failed transfer to {receiver_account} - {message}', 'failed', error_code)
                )
                conn.commit()
        finally:
            conn.close()
    
    def _create_response(self, txn_id, status, message):
        """Create standardized response"""
        requires_complaint = status in self.post_debit_errors
        
        return {
            'success': status == 'SUCCESS',
            'transaction_id': txn_id,
            'status': status,
            'status_code': self.status_codes.get(status, '99'),
            'message': message,
            'requires_complaint': requires_complaint,
            'money_debited': status in self.post_debit_errors or status == 'SUCCESS',
            'timestamp': datetime.now().isoformat()
        }