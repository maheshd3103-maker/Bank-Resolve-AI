import mysql.connector
import json
from datetime import datetime, timedelta

class ComplaintHandlerAgent:
    def __init__(self):
        self.error_mapping = {
            'U17': {'reason': 'Receiver bank down', 'action': 'Auto-refund after 48 hrs', 'resolution_time': '48 hours', 'auto_resolve': True},
            'N05': {'reason': 'Network timeout', 'action': 'Auto requery + refund', 'resolution_time': '24 hours', 'auto_resolve': True},
            'R01': {'reason': 'Payment Switch declined', 'action': 'Manual review required', 'resolution_time': '3-5 days', 'auto_resolve': False},
            'B03': {'reason': 'Beneficiary account mismatch', 'action': 'User correction needed', 'resolution_time': '1-2 days', 'auto_resolve': False},
            'F29': {'reason': 'Fraud/Rule check failed', 'action': 'Escalate to compliance', 'resolution_time': '5-7 days', 'auto_resolve': False},
            'D52': {'reason': 'Insufficient sender balance', 'action': 'Add funds and retry', 'resolution_time': '1 hour', 'auto_resolve': True}
        }
    
    def get_db_connection(self):
        return mysql.connector.connect(
            host='localhost',
            user='root',
            password='root',
            database='banksecure_ai'
        )
    
    def process_complaint(self, complaint_id):
        """Main agent processing function"""
        conn = self.get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        try:
            # Get complaint and transaction details
            cursor.execute('''
                SELECT c.*, t.error_code, t.amount, t.receiver_account, t.failure_reason
                FROM complaints c
                JOIN transactions t ON c.transaction_id = t.transaction_id
                WHERE c.complaint_id = %s
            ''', (complaint_id,))
            
            complaint = cursor.fetchone()
            if not complaint:
                return {'success': False, 'message': 'Complaint not found'}
            
            error_code = complaint['error_code']
            error_info = self.error_mapping.get(error_code, {
                'reason': 'Unknown error', 
                'action': 'Manual review required', 
                'resolution_time': '2-3 days', 
                'auto_resolve': False
            })
            
            if error_info['auto_resolve']:
                return self._auto_resolve_complaint(complaint, error_info, cursor, conn)
            else:
                return self._escalate_to_manual_review(complaint, error_info, cursor, conn)
                
        except Exception as e:
            return {'success': False, 'message': str(e)}
        finally:
            conn.close()
    
    def _auto_resolve_complaint(self, complaint, error_info, cursor, conn):
        """Auto-resolve complaints for network/bank issues"""
        try:
            if complaint['error_code'] in ['U17', 'N05', 'D52']:
                # Initiate refund
                cursor.execute('''
                    UPDATE complaints 
                    SET status = 'REFUND_INITIATED', 
                        resolution_notes = %s,
                        updated_at = NOW()
                    WHERE complaint_id = %s
                ''', (f'Auto-refund processed: {error_info["reason"]}', complaint['complaint_id']))
                
                # Create refund transaction
                cursor.execute('''
                    SELECT account_id FROM transactions WHERE transaction_id = %s
                ''', (complaint['transaction_id'],))
                
                account_info = cursor.fetchone()
                if account_info:
                    # Update account balance
                    cursor.execute('''
                        UPDATE accounts 
                        SET balance = balance + %s 
                        WHERE id = %s
                    ''', (complaint['amount'], account_info['account_id']))
                    
                    # Record refund transaction
                    import random
                    refund_txn_id = f"REF{random.randint(100000, 999999)}"
                    cursor.execute('''
                        INSERT INTO transactions (account_id, transaction_type, amount, 
                                                transaction_id, description, created_at)
                        VALUES (%s, 'refund', %s, %s, %s, NOW())
                    ''', (account_info['account_id'], complaint['amount'], refund_txn_id,
                          f'Refund for failed transaction {complaint["transaction_id"]}'))
                
                conn.commit()
                return {
                    'success': True,
                    'action': 'AUTO_RESOLVED',
                    'message': f'Refund of ₹{complaint["amount"]} processed automatically',
                    'refund_txn_id': refund_txn_id
                }
            
        except Exception as e:
            return {'success': False, 'message': str(e)}
    
    def _escalate_to_manual_review(self, complaint, error_info, cursor, conn):
        """Escalate to human agents for complex issues"""
        try:
            # Assign to appropriate team based on error type
            if complaint['error_code'] == 'F29':
                assigned_team = 'FRAUD_TEAM'
                priority = 'CRITICAL'
            elif complaint['error_code'] == 'R01':
                assigned_team = 'PAYMENT_TEAM'
                priority = 'HIGH'
            elif complaint['error_code'] == 'B03':
                assigned_team = 'CUSTOMER_SERVICE'
                priority = 'MEDIUM'
            else:
                assigned_team = 'GENERAL_SUPPORT'
                priority = 'MEDIUM'
            
            cursor.execute('''
                UPDATE complaints 
                SET status = 'MANUAL_REVIEW',
                    resolution_notes = %s,
                    priority = %s,
                    updated_at = NOW()
                WHERE complaint_id = %s
            ''', (f'Escalated to {assigned_team}: {error_info["reason"]}', 
                  priority, complaint['complaint_id']))
            
            conn.commit()
            return {
                'success': True,
                'action': 'ESCALATED',
                'message': f'Complaint escalated to {assigned_team}',
                'assigned_team': assigned_team,
                'priority': priority,
                'estimated_resolution': error_info['resolution_time']
            }
            
        except Exception as e:
            return {'success': False, 'message': str(e)}
    
    def get_pending_complaints(self):
        """Get all complaints that need agent processing"""
        conn = self.get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        try:
            cursor.execute('''
                SELECT c.*, u.full_name, u.email, t.error_code, t.amount
                FROM complaints c
                JOIN users u ON c.user_id = u.id
                JOIN transactions t ON c.transaction_id = t.transaction_id
                WHERE c.status IN ('AUTO_PROCESSING', 'MANUAL_REVIEW')
                ORDER BY c.created_at DESC
            ''')
            
            return cursor.fetchall()
            
        except Exception as e:
            return []
        finally:
            conn.close()
    
    def resolve_complaint_manually(self, complaint_id, resolution_notes, refund_amount=None):
        """Manual resolution by human agent"""
        conn = self.get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        try:
            if refund_amount:
                # Process manual refund
                cursor.execute('''
                    SELECT c.transaction_id, t.account_id 
                    FROM complaints c
                    JOIN transactions t ON c.transaction_id = t.transaction_id
                    WHERE c.complaint_id = %s
                ''', (complaint_id,))
                
                result = cursor.fetchone()
                if result:
                    # Update balance
                    cursor.execute('''
                        UPDATE accounts SET balance = balance + %s WHERE id = %s
                    ''', (refund_amount, result['account_id']))
                    
                    # Create refund transaction
                    import random
                    refund_txn_id = f"REF{random.randint(100000, 999999)}"
                    cursor.execute('''
                        INSERT INTO transactions (account_id, transaction_type, amount, 
                                                transaction_id, description, created_at)
                        VALUES (%s, 'refund', %s, %s, %s, NOW())
                    ''', (result['account_id'], refund_amount, refund_txn_id,
                          f'Manual refund for complaint {complaint_id}'))
            
            # Update complaint status
            cursor.execute('''
                UPDATE complaints 
                SET status = 'resolved', 
                    resolution_notes = %s,
                    updated_at = NOW()
                WHERE complaint_id = %s
            ''', (resolution_notes, complaint_id))
            
            conn.commit()
            return {'success': True, 'message': 'Complaint resolved successfully'}
            
        except Exception as e:
            return {'success': False, 'message': str(e)}
        finally:
            conn.close()