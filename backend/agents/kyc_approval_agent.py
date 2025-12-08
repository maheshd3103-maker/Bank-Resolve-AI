import mysql.connector
from typing import Dict, Any

class KYCApprovalAgent:
    """AI Agent for automatic KYC approval/rejection based on document validation"""
    
    def __init__(self):
        pass
    
    def get_db_connection(self):
        return mysql.connector.connect(
            host='localhost',
            user='root',
            password='root',
            database='banksecure_ai'
        )
    
    def auto_process_kyc(self, kyc_id: int, validation_results: Dict[str, Any], face_similarity: float = 0.0) -> Dict[str, Any]:
        """Automatically approve or reject KYC based on validation results"""
        
        # Extract validation data
        aadhaar_validation = validation_results.get('aadhaar_validation', {})
        pan_validation = validation_results.get('pan_validation', {})
        
        aadhaar_match = aadhaar_validation.get('match', False)
        pan_match = pan_validation.get('match', False)
        
        extracted_aadhaar = aadhaar_validation.get('extracted')
        extracted_pan = pan_validation.get('extracted')
        profile_aadhaar = aadhaar_validation.get('profile')
        profile_pan = pan_validation.get('profile')
        
        print(f"\n=== KYC AUTO-PROCESSING FOR ID: {kyc_id} ===")
        print(f"Aadhaar Match: {aadhaar_match} (Profile: {profile_aadhaar}, Extracted: {extracted_aadhaar})")
        print(f"PAN Match: {pan_match} (Profile: {profile_pan}, Extracted: {extracted_pan})")
        print(f"Face Similarity: {face_similarity}")
        
        # Decision logic
        approval_decision = self._make_approval_decision(aadhaar_match, pan_match, face_similarity)
        
        # Update database
        try:
            conn = self.get_db_connection()
            cursor = conn.cursor()
            
            if approval_decision['approve']:
                # Auto-approve
                cursor.execute(
                    'UPDATE kyc_verification SET verification_status = %s WHERE id = %s',
                    ('verified', kyc_id)
                )
                print(f"✅ KYC {kyc_id} AUTO-APPROVED: {approval_decision['reason']}")
                
                # Get user and create bank account
                cursor.execute('SELECT user_id FROM kyc_verification WHERE id = %s', (kyc_id,))
                user_result = cursor.fetchone()
                if user_result:
                    user_id = user_result[0]
                    
                    # Update user role to verified customer
                    cursor.execute('UPDATE users SET role = %s WHERE id = %s', ('verified_customer', user_id))
                    print(f"✅ User {user_id} role updated to verified_customer")
                    
                    # Create bank account
                    account_created = self._create_bank_account(cursor, user_id)
                    if account_created:
                        print(f"✅ Complete verification successful for user {user_id}")
                
            else:
                # Auto-reject
                cursor.execute(
                    'UPDATE kyc_verification SET verification_status = %s WHERE id = %s',
                    ('rejected', kyc_id)
                )
                print(f"❌ KYC {kyc_id} AUTO-REJECTED: {approval_decision['reason']}")
            
            conn.commit()
            conn.close()
            
            print(f"Database updated successfully for KYC {kyc_id}")
            return {
                'success': True,
                'approved': approval_decision['approve'],
                'reason': approval_decision['reason']
            }
            
        except Exception as e:
            print(f"Error processing KYC {kyc_id}: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    def _make_approval_decision(self, aadhaar_match: bool, pan_match: bool, face_similarity: float) -> Dict[str, Any]:
        """Make approval decision based on validation results"""
        
        # Both documents must match for approval
        if aadhaar_match and pan_match:
            if face_similarity >= 0.7:
                return {
                    'approve': True,
                    'reason': 'AI Auto-Approval: All documents verified successfully. Aadhaar and PAN numbers match profile data, face verification passed.'
                }
            else:
                return {
                    'approve': True,
                    'reason': 'AI Auto-Approval: Document verification successful. Aadhaar and PAN numbers match profile data.'
                }
        
        # Generate specific rejection reasons
        rejection_reasons = []
        
        if not aadhaar_match:
            rejection_reasons.append("Aadhaar number does not match profile data")
        
        if not pan_match:
            rejection_reasons.append("PAN number does not match profile data")
        
        if face_similarity > 0 and face_similarity < 0.7:
            rejection_reasons.append("Face verification failed")
        
        if not rejection_reasons:
            rejection_reasons.append("Document validation incomplete")
        
        return {
            'approve': False,
            'reason': f'AI Auto-Rejection: {", ".join(rejection_reasons)}. Please resubmit with correct documents.'
        }
    
    def _create_bank_account(self, cursor, user_id: int) -> bool:
        """Create bank account for approved user"""
        try:
            # Check if account already exists
            cursor.execute('SELECT id FROM accounts WHERE user_id = %s', (user_id,))
            if cursor.fetchone():
                print(f"Account already exists for user {user_id}")
                return True
            
            # Generate account number
            import random
            account_number = f"50100{random.randint(100000, 999999)}"
            
            cursor.execute(
                '''INSERT INTO accounts (user_id, account_number, account_type, balance, ifsc_code, branch_name, created_at)
                   VALUES (%s, %s, %s, %s, %s, %s, NOW())''',
                (user_id, account_number, 'Savings', 0.00, 'BSAI0001234', 'BankSecure Main Branch')
            )
            print(f"✅ Bank account created for user {user_id}: {account_number}")
            return True
            
        except Exception as e:
            print(f"Error creating bank account: {e}")
            return False