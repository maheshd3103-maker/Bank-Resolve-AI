from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import mysql.connector
import hashlib
import os
from datetime import datetime
from werkzeug.utils import secure_filename
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app, resources={
    r"/api/*": {
        "origins": ["http://localhost:3000"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization", "Accept", "Origin", "X-Requested-With"]
    }
})

UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024

def get_db_connection():
    conn = mysql.connector.connect(
        host='localhost',
        user='root',
        password='root',  
        database='banksecure_ai'
    )
    return conn

@app.route('/api/test', methods=['GET'])
def test_endpoint():
    return jsonify({'success': True, 'message': 'Backend is working'})

@app.route('/api/test/kyc', methods=['GET'])
def test_kyc_data():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        cursor.execute('SELECT COUNT(*) as count FROM kyc_verification')
        kyc_count = cursor.fetchone()
        
        cursor.execute('SELECT * FROM kyc_verification ORDER BY created_at DESC LIMIT 5')
        recent_kyc = cursor.fetchall()
        
        return jsonify({
            'success': True,
            'kyc_count': kyc_count['count'],
            'recent_submissions': recent_kyc
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})
    finally:
        conn.close()

@app.route('/api/signup', methods=['POST'])
def signup():
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    
    password_hash = hashlib.sha256(data['password'].encode()).hexdigest()
    
    try:
        cursor.execute(
            'INSERT INTO users (full_name, email, password_hash) VALUES (%s, %s, %s)',
            (data['fullName'], data['email'], password_hash)
        )
        conn.commit()
        return jsonify({'success': True, 'message': 'Account created successfully'})
    except mysql.connector.IntegrityError:
        return jsonify({'success': False, 'message': 'Email already exists'})
    finally:
        conn.close()

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    password_hash = hashlib.sha256(data['password'].encode()).hexdigest()
    
    cursor.execute(
        'SELECT * FROM users WHERE email = %s AND password_hash = %s',
        (data['email'], password_hash)
    )
    user = cursor.fetchone()
    
    conn.close()
    
    if user:
        return jsonify({
            'success': True, 
            'message': 'Login successful', 
            'user_id': user['id'],
            'user_name': user['full_name'],
            'user_role': user.get('role', 'customer')
        })
    else:
        return jsonify({'success': False, 'message': 'Invalid credentials'})

@app.route('/api/kyc/submit', methods=['POST'])
def complete_kyc_verification():
    try:
        # Handle both JSON and form data
        if request.is_json:
            user_id = request.json.get('user_id')
            # Create KYC record for JSON request
            conn = get_db_connection()
            cursor = conn.cursor()
            cursor.execute(
                'INSERT INTO kyc_verification (user_id, document_type, document_number, verification_status, created_at) VALUES (%s, %s, %s, %s, NOW())',
                (user_id, 'COMPLETE_KYC', 'FULL_VERIFICATION', 'pending')
            )
            kyc_id = cursor.lastrowid
            conn.commit()
            conn.close()
            return jsonify({'success': True, 'message': 'KYC submission created', 'kyc_id': kyc_id})
        else:
            user_id = request.form.get('user_id')
            
        if not user_id:
            return jsonify({'success': False, 'error': 'User ID required'})
        
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Get or create KYC record
        cursor.execute('SELECT id FROM kyc_verification WHERE user_id = %s ORDER BY created_at DESC LIMIT 1', (user_id,))
        kyc_record = cursor.fetchone()
        
        if kyc_record:
            kyc_id = kyc_record['id']
        else:
            cursor.execute(
                'INSERT INTO kyc_verification (user_id, document_type, document_number, verification_status, created_at) VALUES (%s, %s, %s, %s, NOW())',
                (user_id, 'COMPLETE_KYC', 'FULL_VERIFICATION', 'pending')
            )
            kyc_id = cursor.lastrowid
        
        # Get user profile data for validation  
        cursor.execute('SELECT full_name FROM users WHERE id = %s', (user_id,))
        user_result = cursor.fetchone()
        user_name = user_result['full_name'] if user_result else 'Unknown'
        
        cursor.execute('SELECT aadhaar_number, pan_number, profile_photo FROM profiles WHERE user_id = %s', (user_id,))
        profile_result = cursor.fetchone()
        profile_aadhaar = profile_result['aadhaar_number'] if profile_result else None
        profile_pan = profile_result['pan_number'] if profile_result else None
        profile_photo_path = profile_result['profile_photo'] if profile_result else None
        
        print(f"Profile data - Aadhaar: {profile_aadhaar}, PAN: {profile_pan}")
        
        # Process uploaded files quickly (no extraction)
        file_paths = {}
        for file_key in ['aadhaar', 'address_proof', 'selfie']:
            if file_key in request.files:
                file = request.files[file_key]
                if file.filename != '':
                    filename = secure_filename(file.filename)
                    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S_')
                    unique_filename = f"{file_key}_{timestamp}{filename}"
                    file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
                    file.save(file_path)
                    file_paths[file_key] = file_path
                    
                    cursor.execute(
                        '''INSERT INTO documents (user_id, kyc_id, document_type, file_name, file_path, 
                           file_size, mime_type, uploaded_at)
                           VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())''',
                        (user_id, kyc_id, file_key, unique_filename, file_path, 
                         os.path.getsize(file_path), getattr(file, 'content_type', 'application/octet-stream'))
                    )
        
        # Simple mock validation for now
        print(f"Documents uploaded for user {user_id}:")
        for key, path in file_paths.items():
            print(f"- {key}: {os.path.basename(path)}")
        
        conn.commit()
        conn.close()
        
        # Fast background processing
        import threading
        def fast_processing():
            try:
                from agents.extract_agent import DocumentExtractAgent
                from agents.face_verification_agent import FaceVerificationAgent
                from agents.kyc_approval_agent import KYCApprovalAgent
                
                extract_agent = DocumentExtractAgent()
                face_agent = FaceVerificationAgent()
                approval_agent = KYCApprovalAgent()
                
                validation_results = extract_agent.validate_documents(
                    aadhaar_path=file_paths.get('aadhaar'),
                    pan_path=file_paths.get('address_proof'),
                    profile_aadhaar=profile_aadhaar,
                    profile_pan=profile_pan,
                    profile_name=user_name
                )
                
                face_similarity = 0.0
                if file_paths.get('selfie') and profile_photo_path and os.path.exists(profile_photo_path):
                    face_result = face_agent.verify_face_match(
                        profile_photo_path=profile_photo_path,
                        document_photo_path=file_paths.get('selfie')
                    )
                    if face_result:
                        face_similarity = face_result.get('similarity_score', 0.0)
                
                # Use PAN extracted name if available, otherwise use Aadhaar extracted name
                pan_name = validation_results.get('pan_validation', {}).get('extracted_name')
                aadhaar_name = validation_results.get('aadhaar_validation', {}).get('extracted_name')
                extracted_name = pan_name if pan_name else aadhaar_name
                
                verification_data = {
                    'extracted_aadhaar': validation_results.get('aadhaar_validation', {}).get('extracted'),
                    'extracted_pan': validation_results.get('pan_validation', {}).get('extracted'),
                    'extracted_name': extracted_name,
                    'face_similarity': float(face_similarity) if face_similarity else 0.0
                }
                
                import json
                conn2 = get_db_connection()
                cursor2 = conn2.cursor()
                cursor2.execute(
                    'UPDATE kyc_verification SET ai_feedback = %s WHERE id = %s',
                    (json.dumps(verification_data), kyc_id)
                )
                conn2.commit()
                conn2.close()
                
                approval_result = approval_agent.auto_process_kyc(kyc_id, validation_results, face_similarity)
                print(f"KYC auto-processed: {'Approved' if approval_result.get('approved') else 'Rejected'}")
                
            except Exception as e:
                print(f"Processing error: {e}")
        
        thread = threading.Thread(target=fast_processing)
        thread.daemon = True
        thread.start()
        
        return jsonify({'success': True, 'message': 'KYC documents submitted successfully'})
        
    except Exception as e:
        print(f"ERROR in complete_kyc_verification: {e}")
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/profile/<int:user_id>', methods=['GET'])
def get_profile(user_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        cursor.execute('SELECT id, full_name, email, created_at FROM users WHERE id = %s', (user_id,))
        user_data = cursor.fetchone()
        
        if not user_data:
            return jsonify({'success': False, 'error': 'User not found'})
        
        cursor.execute('SELECT * FROM profiles WHERE user_id = %s', (user_id,))
        profile_data = cursor.fetchone()
        
        cursor.execute('SELECT * FROM accounts WHERE user_id = %s', (user_id,))
        account_data = cursor.fetchone()
        
        profile = {
            **user_data,
            **(profile_data if profile_data else {}),
            'account_number': account_data.get('account_number') if account_data else None,
            'account_type': account_data.get('account_type') if account_data else None,
            'balance': account_data.get('balance') if account_data else None,
            'ifsc_code': account_data.get('ifsc_code') if account_data else None,
            'branch_name': account_data.get('branch_name') if account_data else None,
            'account_created': account_data.get('created_at') if account_data else None
        }
        
        return jsonify({'success': True, 'profile': profile})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})
    finally:
        conn.close()

@app.route('/api/profile/<int:user_id>/photo', methods=['POST'])
def upload_profile_photo(user_id):
    try:
        if 'photo' not in request.files:
            return jsonify({'success': False, 'error': 'No photo file provided'})
        
        file = request.files['photo']
        if file.filename == '':
            return jsonify({'success': False, 'error': 'No file selected'})
        
        filename = secure_filename(file.filename)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S_')
        unique_filename = f"profile_{user_id}_{timestamp}{filename}"
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
        file.save(file_path)
        
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute('SELECT id FROM profiles WHERE user_id = %s', (user_id,))
        profile_exists = cursor.fetchone()
        
        if profile_exists:
            cursor.execute('UPDATE profiles SET profile_photo = %s WHERE user_id = %s', (file_path, user_id))
        else:
            cursor.execute('INSERT INTO profiles (user_id, profile_photo) VALUES (%s, %s)', (user_id, file_path))
        
        conn.commit()
        conn.close()
        
        return jsonify({'success': True, 'message': 'Profile photo uploaded successfully', 'photo_path': file_path})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/profile/<int:user_id>', methods=['PUT'])
def update_profile(user_id):
    data = request.json
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        if data.get('full_name'):
            cursor.execute('UPDATE users SET full_name = %s WHERE id = %s', 
                         (data.get('full_name'), user_id))
        
        cursor.execute('SELECT id FROM profiles WHERE user_id = %s', (user_id,))
        profile_exists = cursor.fetchone()
        
        if profile_exists:
            cursor.execute(
                '''UPDATE profiles SET 
                   date_of_birth = %s, gender = %s, mobile_number = %s, occupation = %s,
                   father_mother_name = %s, marital_status = %s, permanent_address = %s,
                   present_address = %s, pin_code = %s, city = %s, state = %s,
                   country = %s, aadhaar_number = %s, pan_number = %s
                   WHERE user_id = %s''',
                (data.get('date_of_birth'), data.get('gender'), data.get('mobile_number'),
                 data.get('occupation'), data.get('father_mother_name'), data.get('marital_status'),
                 data.get('permanent_address'), data.get('present_address'), data.get('pin_code'),
                 data.get('city'), data.get('state'), data.get('country'),
                 data.get('aadhaar_number'), data.get('pan_number'), user_id)
            )
        else:
            cursor.execute(
                '''INSERT INTO profiles 
                   (user_id, date_of_birth, gender, mobile_number, occupation,
                    father_mother_name, marital_status, permanent_address, present_address,
                    pin_code, city, state, country, aadhaar_number, pan_number)
                   VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)''',
                (user_id, data.get('date_of_birth'), data.get('gender'), data.get('mobile_number'),
                 data.get('occupation'), data.get('father_mother_name'), data.get('marital_status'),
                 data.get('permanent_address'), data.get('present_address'), data.get('pin_code'),
                 data.get('city'), data.get('state'), data.get('country'),
                 data.get('aadhaar_number'), data.get('pan_number'))
            )
        
        conn.commit()
        return jsonify({'success': True, 'message': 'Profile updated successfully'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})
    finally:
        conn.close()

@app.route('/api/kyc-status/<int:user_id>', methods=['GET'])
def get_kyc_status(user_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        cursor.execute(
            'SELECT verification_status FROM kyc_verification WHERE user_id = %s ORDER BY created_at DESC LIMIT 1',
            (user_id,)
        )
        kyc_record = cursor.fetchone()
        
        account_info = None
        if kyc_record and kyc_record['verification_status'] == 'verified':
            cursor.execute(
                'SELECT account_number, account_type, balance, ifsc_code, branch_name FROM accounts WHERE user_id = %s',
                (user_id,)
            )
            account_info = cursor.fetchone()
        
        return jsonify({
            'success': True,
            'kyc_status': kyc_record['verification_status'] if kyc_record else 'not_submitted',
            'account_info': account_info
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})
    finally:
        conn.close()

@app.route('/api/manager/users', methods=['GET'])
def get_users():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        cursor.execute(
            '''SELECT DISTINCT u.id, u.full_name, u.email, u.role, u.created_at,
               (SELECT verification_status FROM kyc_verification WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1) as kyc_status,
               a.account_number, a.account_type, a.balance
               FROM users u 
               LEFT JOIN accounts a ON u.id = a.user_id
               WHERE u.role IN ('customer', 'verified_customer')
               ORDER BY u.created_at DESC'''
        )
        users = cursor.fetchall()
        
        return jsonify({
            'success': True,
            'users': users
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})
    finally:
        conn.close()

@app.route('/api/deposit', methods=['POST'])
def deposit_money():
    data = request.json
    user_id = data.get('user_id')
    amount = data.get('amount')
    
    if not user_id or not amount or amount <= 0:
        return jsonify({'success': False, 'message': 'Invalid user ID or amount'})
    
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        # Get account info
        cursor.execute('SELECT id, balance, account_number FROM accounts WHERE user_id = %s', (user_id,))
        account = cursor.fetchone()
        
        if not account:
            return jsonify({'success': False, 'message': 'Account not found'})
        
        # Generate transaction ID
        import random
        transaction_id = f"TXN{random.randint(100000, 999999)}"
        
        # Update balance
        new_balance = float(account['balance']) + float(amount)
        cursor.execute('UPDATE accounts SET balance = %s WHERE user_id = %s', (new_balance, user_id))
        
        # Record transaction with ID
        cursor.execute(
            '''INSERT INTO transactions (account_id, transaction_type, amount, balance_after,
               transaction_id, description, created_at)
               VALUES (%s, %s, %s, %s, %s, %s, NOW())''',
            (account['id'], 'deposit', amount, new_balance, transaction_id, f'Cash deposit to account {account["account_number"]}')
        )
        
        conn.commit()
        
        return jsonify({
            'success': True,
            'message': f'Deposit successful! Transaction ID: {transaction_id}',
            'transaction_id': transaction_id,
            'new_balance': new_balance
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})
    finally:
        conn.close()

@app.route('/api/transactions/<int:user_id>', methods=['GET'])
def get_transactions(user_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        cursor.execute(
            '''SELECT t.transaction_id, t.transaction_type, t.amount, t.description, t.created_at
               FROM transactions t 
               WHERE t.account_id IN (SELECT id FROM accounts WHERE user_id = %s)
               ORDER BY t.created_at DESC LIMIT 50''',
            (user_id,)
        )
        transactions = cursor.fetchall()
        
        return jsonify({
            'success': True,
            'transactions': transactions
        })
    except Exception as e:
        return jsonify({
            'success': True,
            'transactions': []
        })
    finally:
        conn.close()

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    try:
        return send_file(os.path.join(app.config['UPLOAD_FOLDER'], filename))
    except Exception as e:
        return jsonify({'error': 'File not found'}), 404

@app.route('/api/manager/user/<int:user_id>', methods=['GET'])
def get_user_details(user_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        # Get user basic info
        cursor.execute('SELECT * FROM users WHERE id = %s', (user_id,))
        user = cursor.fetchone()
        
        if not user:
            return jsonify({'success': False, 'error': 'User not found'})
        
        # Get profile info
        cursor.execute('SELECT * FROM profiles WHERE user_id = %s', (user_id,))
        profile = cursor.fetchone()
        
        # Get account info
        cursor.execute('SELECT * FROM accounts WHERE user_id = %s', (user_id,))
        account = cursor.fetchone()
        
        # Get KYC info
        cursor.execute(
            'SELECT * FROM kyc_verification WHERE user_id = %s ORDER BY created_at DESC LIMIT 1',
            (user_id,)
        )
        kyc = cursor.fetchone()
        
        return jsonify({
            'success': True,
            'user': user,
            'profile': profile,
            'account': account,
            'kyc': kyc
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})
    finally:
        conn.close()

@app.route('/api/manager/kyc-applications', methods=['GET'])
def get_kyc_applications():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        cursor.execute(
            '''SELECT k.id, k.user_id, u.full_name as userName, u.email, 
               k.verification_status as status, k.created_at as submittedDate,
               k.ai_feedback, p.aadhaar_number as profile_aadhaar, p.pan_number as profile_pan
               FROM kyc_verification k 
               JOIN users u ON k.user_id = u.id 
               LEFT JOIN profiles p ON k.user_id = p.user_id
               ORDER BY k.created_at DESC'''
        )
        applications = cursor.fetchall()
        
        # Get document files for each application
        for app in applications:
            cursor.execute(
                'SELECT document_type, file_name FROM documents WHERE kyc_id = %s',
                (app['id'],)
            )
            documents = cursor.fetchall()
            app['documents'] = {doc['document_type']: doc['file_name'] for doc in documents}
        
        # Parse AI feedback for each application
        for app in applications:
            app['extracted_aadhaar'] = None
            app['extracted_pan'] = None
            app['extracted_name'] = 'Not extracted'
            app['name_similarity'] = 0.0
            app['face_similarity'] = 0.0
            
            if app['ai_feedback']:
                try:
                    import json
                    ai_data = json.loads(app['ai_feedback'])
                    
                    app['extracted_aadhaar'] = ai_data.get('extracted_aadhaar')
                    app['extracted_pan'] = ai_data.get('extracted_pan')
                    app['extracted_name'] = ai_data.get('extracted_name', 'Not extracted')
                    app['face_similarity'] = float(ai_data.get('face_similarity', 0.0)) if ai_data.get('face_similarity') else 0.0
                    app['name_similarity'] = 0.9  # Mock similarity
                except Exception as e:
                    pass
        
        return jsonify({
            'success': True,
            'applications': applications
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})
    finally:
        conn.close()

@app.route('/api/transfer', methods=['POST'])
def transfer_money():
    data = request.json
    user_id = data.get('user_id')
    receiver_name = data.get('receiver_name')
    receiver_account = data.get('receiver_account')
    receiver_bank = data.get('receiver_bank')
    amount = float(data.get('amount', 0))
    purpose = data.get('purpose', 'Transfer')
    
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        # Get sender account
        cursor.execute('SELECT id, balance, account_number FROM accounts WHERE user_id = %s', (user_id,))
        sender_account = cursor.fetchone()
        
        if not sender_account:
            return jsonify({'success': False, 'message': 'Sender account not found'})
        
        # Generate transaction ID
        import random
        transaction_id = f"TXN{random.randint(100000, 999999)}"
        
        # Step 1: Create temporary transaction with PROCESSING status
        cursor.execute(
            '''INSERT INTO transactions (account_id, transaction_type, amount, balance_after,
               transaction_id, receiver_account, description, created_at)
               VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())''',
            (sender_account['id'], 'transfer', amount, sender_account['balance'], 
             transaction_id, receiver_account, f'{purpose} to {receiver_name} - {receiver_bank}')
        )
        
        # Step 2: Simulate NPCI/Bank Response (30% failure rate for demo)
        transaction_result = random.choices(
            ['SUCCESS', 'FAILED', 'PENDING'], 
            weights=[70, 25, 5]
        )[0]
        
        error_mapping = {
            'U17': {'reason': 'Receiver bank down', 'action': 'Auto-refund after 48 hrs', 'auto_resolve': True},
            'N05': {'reason': 'Network timeout', 'action': 'Auto requery + refund', 'auto_resolve': True},
            'R01': {'reason': 'Payment Switch declined', 'action': 'Manual review required', 'auto_resolve': False},
            'B03': {'reason': 'Beneficiary account mismatch', 'action': 'User correction needed', 'auto_resolve': False},
            'F29': {'reason': 'Fraud/Rule check failed', 'action': 'Escalate to compliance', 'auto_resolve': False},
            'D52': {'reason': 'Insufficient sender balance', 'action': 'Add funds and retry', 'auto_resolve': True}
        }
        
        if transaction_result == 'SUCCESS':
            # Deduct amount and update transaction
            new_balance = sender_account['balance'] - amount
            cursor.execute('UPDATE accounts SET balance = %s WHERE user_id = %s', (new_balance, user_id))
            cursor.execute(
                'UPDATE transactions SET balance_after = %s WHERE transaction_id = %s',
                (new_balance, transaction_id)
            )
            
            conn.commit()
            return jsonify({
                'success': True,
                'status': 'SUCCESS',
                'message': f'₹{amount} transferred successfully to {receiver_name}',
                'transaction_id': transaction_id,
                'new_balance': new_balance
            })
            
        elif transaction_result == 'FAILED':
            # Step 3: Auto-generate error code
            error_code = random.choice(list(error_mapping.keys()))
            error_info = error_mapping[error_code]
            
            # Update transaction with failure details
            cursor.execute(
                '''UPDATE transactions SET error_code = %s, failure_reason = %s 
                   WHERE transaction_id = %s''',
                (error_code, error_info['reason'], transaction_id)
            )
            
            conn.commit()
            return jsonify({
                'success': False,
                'status': 'FAILED',
                'message': f'Transaction failed: {error_info["reason"]}',
                'transaction_id': transaction_id,
                'error_code': error_code,
                'can_raise_complaint': True
            })
            
        else:  # PENDING
            conn.commit()
            return jsonify({
                'success': True,
                'status': 'PENDING',
                'message': 'Transaction is being processed. You will be notified once completed.',
                'transaction_id': transaction_id,
                'can_raise_complaint': False
            })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})
    finally:
        conn.close()

@app.route('/api/manager/complaints', methods=['GET'])
def get_complaints():
    try:
        from agents.complaint_handler_agent import ComplaintHandlerAgent
        agent = ComplaintHandlerAgent()
        complaints = agent.get_pending_complaints()
        
        return jsonify({
            'success': True,
            'complaints': complaints
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/manager/complaints/<complaint_id>/resolve', methods=['POST'])
def resolve_complaint(complaint_id):
    data = request.json
    resolution_notes = data.get('resolution_notes')
    refund_amount = data.get('refund_amount')
    
    try:
        from agents.complaint_handler_agent import ComplaintHandlerAgent
        agent = ComplaintHandlerAgent()
        result = agent.resolve_complaint_manually(complaint_id, resolution_notes, refund_amount)
        
        return jsonify(result)
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/validate-account', methods=['POST'])
def validate_account():
    data = request.json
    account_number = data.get('account_number')
    
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        cursor.execute('SELECT account_holder_name, bank_name, status FROM external_accounts WHERE account_number = %s', (account_number,))
        account = cursor.fetchone()
        
        if account:
            return jsonify({
                'success': True,
                'account_holder_name': account['account_holder_name'],
                'bank_name': account['bank_name'],
                'status': account['status']
            })
        else:
            return jsonify({'success': False, 'message': 'Account not found'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})
    finally:
        conn.close()

@app.route('/api/complaints', methods=['POST'])
def submit_complaint():
    data = request.json
    user_id = data.get('user_id')
    transaction_id = data.get('transaction_id')
    
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        # Step 1: Get transaction details and error code
        cursor.execute(
            'SELECT * FROM transactions WHERE transaction_id = %s AND account_id IN (SELECT id FROM accounts WHERE user_id = %s)',
            (transaction_id, user_id)
        )
        transaction = cursor.fetchone()
        
        if not transaction:
            return jsonify({'success': False, 'message': 'Transaction not found'})
        
        # Generate complaint ID
        import random
        complaint_id = f"CMP{random.randint(100000, 999999)}"
        
        # Step 2: Root Cause Analysis based on error code
        error_code = transaction.get('error_code')
        error_mapping = {
            'U17': {'reason': 'Receiver bank down', 'action': 'Auto-refund after 48 hrs', 'resolution_time': '48 hours', 'auto_resolve': True},
            'N05': {'reason': 'Network timeout', 'action': 'Auto requery + refund', 'resolution_time': '24 hours', 'auto_resolve': True},
            'R01': {'reason': 'Payment Switch declined', 'action': 'Manual review required', 'resolution_time': '3-5 days', 'auto_resolve': False},
            'B03': {'reason': 'Beneficiary account mismatch', 'action': 'User correction needed', 'resolution_time': '1-2 days', 'auto_resolve': False},
            'F29': {'reason': 'Fraud/Rule check failed', 'action': 'Escalate to compliance', 'resolution_time': '5-7 days', 'auto_resolve': False},
            'D52': {'reason': 'Insufficient sender balance', 'action': 'Add funds and retry', 'resolution_time': '1 hour', 'auto_resolve': True}
        }
        
        root_cause_info = error_mapping.get(error_code, {
            'reason': 'Unknown error', 
            'action': 'Manual review required', 
            'resolution_time': '2-3 days', 
            'auto_resolve': False
        })
        
        # Determine status based on auto-resolve capability
        complaint_status = 'AUTO_PROCESSING' if root_cause_info['auto_resolve'] else 'MANUAL_REVIEW'
        
        # Step 3: Insert complaint with root cause analysis
        cursor.execute(
            '''INSERT INTO complaints (complaint_id, user_id, transaction_id, transaction_date, 
               amount, receiver_account, issue_type, description, priority, status, 
               root_cause, resolution_action, estimated_resolution, created_at)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())''',
            (complaint_id, user_id, transaction_id, transaction['created_at'].date(),
             transaction['amount'], transaction['receiver_account'], 
             data.get('issue_type', 'failed_transaction'), data.get('additional_comments', ''),
             'high', complaint_status, root_cause_info['reason'], 
             root_cause_info['action'], root_cause_info['resolution_time'])
        )
        
        conn.commit()
        
        # Step 4: Process complaint with AI agent
        import threading
        def process_with_agent():
            try:
                from agents.complaint_handler_agent import ComplaintHandlerAgent
                agent = ComplaintHandlerAgent()
                result = agent.process_complaint(complaint_id)
                print(f"Agent processed complaint {complaint_id}: {result}")
            except Exception as e:
                print(f"Agent processing error: {e}")
        
        # Process in background
        thread = threading.Thread(target=process_with_agent)
        thread.daemon = True
        thread.start()
        
        # Step 5: Prepare response
        response_data = {
            'complaint_id': complaint_id,
            'status': complaint_status,
            'root_cause': root_cause_info['reason'],
            'resolution_action': root_cause_info['action'],
            'estimated_resolution': root_cause_info['resolution_time']
        }
        
        if root_cause_info['auto_resolve']:
            response_data['message'] = 'Your complaint is being processed automatically. Refund will be initiated shortly.'
        else:
            response_data['message'] = 'Your complaint requires manual review by our support team.'
        
        return jsonify({
            'success': True,
            'ai_response': response_data
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})
    finally:
        conn.close()

def old_submit_complaint():
    data = request.json
    user_id = data.get('user_id')
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Auto-determine priority based on issue type and amount
        issue_type = data.get('issueType', '')
        amount = float(data.get('amount', 0))
        
        if 'unauthorized' in issue_type or 'fraud' in issue_type:
            priority = 'critical'
        elif amount > 10000:
            priority = 'high'
        elif 'failed' in issue_type or 'not_credited' in issue_type:
            priority = 'high'
        else:
            priority = 'medium'
        
        # Generate complaint ID
        import random
        complaint_id = f"CMP{random.randint(100000, 999999)}"
        
        # Insert complaint
        cursor.execute(
            '''INSERT INTO complaints (complaint_id, user_id, transaction_id, transaction_date, 
               amount, receiver_account, issue_type, description, priority, status, created_at)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())''',
            (complaint_id, user_id, data.get('transactionId'), data.get('transactionDate'),
             amount, data.get('receiverAccount'), issue_type, data.get('description'), priority, 'processing')
        )
        
        conn.commit()
        
        # AI Processing simulation
        ai_response = {
            'complaint_id': complaint_id,
            'status': 'processing',
            'estimated_resolution': '2-4 hours',
            'next_steps': [
                'Transaction verification in progress',
                'Checking with payment gateway',
                'Preparing refund if eligible'
            ]
        }
        
        if priority == 'critical':
            ai_response['estimated_resolution'] = '30 minutes'
            ai_response['next_steps'] = ['Fraud team notified', 'Account security check', 'Immediate investigation']
        
        return jsonify({
            'success': True,
            'message': 'Complaint submitted successfully!',
            'ai_response': ai_response
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})
    finally:
        conn.close()

@app.route('/api/chat', methods=['POST'])
def chat_with_bot():
    try:
        data = request.json
        message = data.get('message', '')
        user_id = data.get('user_id')
        
        if not message:
            return jsonify({'success': False, 'error': 'Message is required'})
        
        from agents.chatbot_agent import BankingChatbotAgent
        chatbot = BankingChatbotAgent()
        response = chatbot.process_message(message, user_id)
        
        return jsonify({
            'success': True,
            'response': response
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Sorry, I encountered an error processing your request.'
        })

if __name__ == '__main__':
    app.run(debug=True, port=5000, host='0.0.0.0')