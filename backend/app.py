from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import sys
import os

# Add RAG module to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'rag'))

try:
    from rag.api import rag_bp
except ImportError:
    rag_bp = None
except Exception:
    rag_bp = None
import mysql.connector
import hashlib
import os
import time
import random
import traceback
import io
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

# Register RAG blueprint if available
if rag_bp:
    app.register_blueprint(rag_bp)
    print("RAG API endpoints registered")
else:
    print("RAG API not available")

UPLOAD_FOLDER = 'uploads'
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 100 * 1024 * 1024

def get_db_connection():
    conn = mysql.connector.connect(
        host=os.getenv('DB_HOST', 'localhost'),
        user=os.getenv('DB_USER', 'root'),
        password=os.getenv('DB_PASSWORD', 'root'),  
        database=os.getenv('DB_NAME', 'banksecure')
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
    
    email = data['email']
    password_hash = hashlib.sha256(data['password'].encode()).hexdigest()
    
    # First check if email exists
    cursor.execute('SELECT * FROM users WHERE email = %s', (email,))
    user_by_email = cursor.fetchone()
    
    if not user_by_email:
        conn.close()
        return jsonify({'success': False, 'message': 'Email not found. Please check your email or sign up first.'})
    
    # Then check password
    cursor.execute(
        'SELECT * FROM users WHERE email = %s AND password_hash = %s',
        (email, password_hash)
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
        return jsonify({'success': False, 'message': 'Incorrect password. Please try again.'})

def fallback_regex_extraction(ocr_text, extracted_data, file_key):
    """Fallback regex extraction if AI fails"""
    import re
    
    # Extract Aadhaar number
    aadhaar_patterns = [
        r'\b\d{4}\s*\d{4}\s*\d{4}\b',
        r'\b\d{12}\b'
    ]
    
    for pattern in aadhaar_patterns:
        match = re.search(pattern, ocr_text)
        if match:
            aadhaar = re.sub(r'\D', '', match.group())
            if len(aadhaar) == 12:
                extracted_data['aadhaar'] = aadhaar
                break
    
    # Extract PAN number
    pan_pattern = r'\b[A-Z]{5}\d{4}[A-Z]\b'
    pan_match = re.search(pan_pattern, ocr_text.upper())
    if pan_match:
        extracted_data['pan'] = pan_match.group()

@app.route('/api/kyc/submit', methods=['POST'])
def complete_kyc_verification():
    try:
        # Handle both JSON and form data
        if request.is_json:
            user_id = request.json.get('user_id')
            # Create KYC record for JSON request
            conn = get_db_connection()
            cursor = conn.cursor()
            
            # Check if KYC record already exists
            cursor.execute('SELECT id FROM kyc_verification WHERE user_id = %s ORDER BY created_at DESC LIMIT 1', (user_id,))
            existing_kyc = cursor.fetchone()
            
            if existing_kyc:
                kyc_id = existing_kyc[0]
            else:
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
        
        # Get existing KYC record (should exist from JSON request)
        cursor.execute('SELECT id FROM kyc_verification WHERE user_id = %s ORDER BY created_at DESC LIMIT 1', (user_id,))
        kyc_record = cursor.fetchone()
        
        if not kyc_record:
            return jsonify({'success': False, 'error': 'KYC record not found. Please try again.'})
        
        kyc_id = kyc_record['id']
        
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
        
        # Process uploaded files and extract data using OCR
        file_paths = {}
        extracted_data = {}
        
        for file_key in ['aadhaar', 'address_proof', 'selfie']:
            if file_key in request.files:
                file = request.files[file_key]
                if file.filename != '':
                    # Delete old document of same type for this user
                    cursor.execute('SELECT file_path FROM documents WHERE user_id = %s AND document_type = %s', (user_id, file_key))
                    old_docs = cursor.fetchall()
                    for old_doc in old_docs:
                        if old_doc['file_path'] and os.path.exists(old_doc['file_path']):
                            os.remove(old_doc['file_path'])
                    
                    # Delete old document records
                    cursor.execute('DELETE FROM documents WHERE user_id = %s AND document_type = %s', (user_id, file_key))
                    
                    filename = secure_filename(file.filename)
                    timestamp = datetime.now().strftime('%Y%m%d_%H%M%S_')
                    unique_filename = f"{file_key}_{timestamp}{filename}"
                    file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
                    file.save(file_path)
                    file_paths[file_key] = file_path
                    
                    # Extract data using OCR
                    try:
                        import easyocr
                        import re
                        import fitz  # PyMuPDF for PDF handling
                        
                        reader = easyocr.Reader(['en'])
                        ocr_text = ""
                        
                        # Handle PDF files
                        if file_path.lower().endswith('.pdf'):
                            doc = fitz.open(file_path)
                            for page in doc:
                                pix = page.get_pixmap()
                                img_data = pix.tobytes("ppm")
                                result = reader.readtext(img_data)
                                ocr_text += " ".join([text[1] for text in result]) + "\n"
                            doc.close()
                        else:
                            # Handle image files
                            result = reader.readtext(file_path)
                            ocr_text = " ".join([text[1] for text in result])
                        
                        print(f"\nEasyOCR extracted text from {file_key}:")
                        print(ocr_text)
                        
                        # Use AI to clean and extract data from OCR text
                        try:
                            import google.generativeai as genai
                            genai.configure(api_key=os.getenv('GEMINI_API_KEY'))
                            model = genai.GenerativeModel('gemini-pro')
                            
                            prompt = f"""
                            Extract the following information from this OCR text:
                            
                            OCR Text: {ocr_text}
                            
                            Please extract and return ONLY:
                            1. Aadhaar Number (12 digits)
                            2. PAN Number (format: ABCDE1234F)
                            3. Full Name
                            
                            Return in this exact JSON format:
                            {{
                                "aadhaar": "123456789012",
                                "pan": "ABCDE1234F",
                                "name": "FULL NAME"
                            }}
                            
                            If any field is not found, use null. Only return the JSON, no other text.
                            """
                            
                            response = model.generate_content(prompt)
                            ai_result = response.text.strip()
                            
                            # Parse AI response
                            import json
                            try:
                                ai_data = json.loads(ai_result)
                                if ai_data.get('aadhaar'):
                                    extracted_data['aadhaar'] = ai_data['aadhaar']
                                if ai_data.get('pan'):
                                    extracted_data['pan'] = ai_data['pan']
                                if ai_data.get('name'):
                                    extracted_data['name'] = ai_data['name']
                                print(f"AI extracted: {ai_data}")
                            except json.JSONDecodeError:
                                print(f"AI response not valid JSON: {ai_result}")
                                # Fallback to regex extraction
                                fallback_regex_extraction(ocr_text, extracted_data, file_key)
                        except Exception as e:
                            print(f"AI extraction failed: {e}")
                            # Fallback to regex extraction
                            fallback_regex_extraction(ocr_text, extracted_data, file_key)
                    
                    except Exception as e:
                        print(f"OCR extraction failed for {file_key}: {e}")
                    
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
        
        # Compare extracted data with profile data for auto-approval
        extracted_aadhaar = extracted_data.get('aadhaar')
        extracted_pan = extracted_data.get('pan')
        extracted_name = extracted_data.get('name')
        
        print(f"\n=== KYC VALIDATION FOR USER {user_id} ===")
        print(f"Profile data - Aadhaar: {profile_aadhaar}, PAN: {profile_pan}")
        print(f"Extracted data - Aadhaar: {extracted_aadhaar}, PAN: {extracted_pan}, Name: {extracted_name}")
        
        # Check if extracted data matches profile (both Aadhaar and PAN must match)
        aadhaar_match = (extracted_aadhaar and profile_aadhaar and 
                        profile_aadhaar.replace(' ', '') == extracted_aadhaar.replace(' ', ''))
        pan_match = (extracted_pan and profile_pan and profile_pan.upper() == extracted_pan.upper())
        
        print(f"Comparison results - Aadhaar match: {aadhaar_match}, PAN match: {pan_match}")
        
        # Auto-approve only if both Aadhaar and PAN match
        if aadhaar_match and pan_match:
            status = 'verified'
            print(f"✅ KYC AUTO-APPROVED - Data matches profile")
        else:
            status = 'pending'
            print(f"⏳ KYC PENDING - Data doesn't match profile, requires manual review")
        
        print(f"Final verification status: {status}")
        print("=" * 50)
        
        verification_data = {
            'extracted_aadhaar': extracted_aadhaar,
            'extracted_pan': extracted_pan,
            'extracted_name': extracted_name,
            'face_similarity': 1.0
        }
        
        import json
        conn2 = get_db_connection()
        cursor2 = conn2.cursor()
        cursor2.execute(
            'UPDATE kyc_verification SET ai_feedback = %s, verification_status = %s WHERE id = %s',
            (json.dumps(verification_data), status, kyc_id)
        )
        
        # Only create account if KYC is approved
        if status == 'verified':
            # Check if account already exists
            cursor2.execute('SELECT id FROM accounts WHERE user_id = %s', (user_id,))
            existing_account = cursor2.fetchone()
            
            if not existing_account:
                # Create bank account
                import random
                account_number = f"ACC{random.randint(1000000000, 9999999999)}"
                cursor2.execute(
                    '''INSERT INTO accounts (user_id, account_number, account_type, balance, ifsc_code, branch_name, created_at)
                       VALUES (%s, %s, %s, %s, %s, %s, NOW())''',
                    (user_id, account_number, 'Savings', 0.00, 'BSAI0001234', 'BankSecure AI Main Branch')
                )
                print(f"✅ Bank account {account_number} created for user {user_id}")
            
            # Update user role
            cursor2.execute('UPDATE users SET role = %s WHERE id = %s', ('verified_customer', user_id))
        
        conn2.commit()
        conn2.close()
        
        return jsonify({
            'success': True, 
            'message': 'KYC documents submitted successfully!' + (' Your bank account has been created.' if status == 'verified' else ' Documents are under review.'),
            'kyc_id': kyc_id,
            'status': status,
            'auto_approved': status == 'verified'
        })
        
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
            'account_created': account_data.get('created_at') if account_data else None,
            'profile_photo_url': f'http://localhost:5000/uploads/{os.path.basename(profile_data["profile_photo"])}' if profile_data and profile_data.get('profile_photo') else None
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
        
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Get existing photo path to delete old file
        cursor.execute('SELECT profile_photo FROM profiles WHERE user_id = %s', (user_id,))
        existing_profile = cursor.fetchone()
        
        # Delete old photo file if exists
        if existing_profile and existing_profile['profile_photo']:
            old_file_path = existing_profile['profile_photo']
            if os.path.exists(old_file_path):
                os.remove(old_file_path)
        
        # Save new photo
        filename = secure_filename(file.filename)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S_')
        unique_filename = f"profile_{user_id}_{timestamp}{filename}"
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
        file.save(file_path)
        
        # Update database
        cursor.execute('SELECT id FROM profiles WHERE user_id = %s', (user_id,))
        profile_exists = cursor.fetchone()
        
        if profile_exists:
            cursor.execute('UPDATE profiles SET profile_photo = %s WHERE user_id = %s', (file_path, user_id))
        else:
            cursor.execute('INSERT INTO profiles (user_id, profile_photo) VALUES (%s, %s)', (user_id, file_path))
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success': True, 
            'message': 'Profile photo uploaded successfully', 
            'photo_path': file_path,
            'photo_url': f'http://localhost:5000/uploads/{unique_filename}'
        })
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

@app.route('/api/kyc-documents/<int:user_id>', methods=['GET'])
def get_kyc_documents(user_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        # Get KYC record
        cursor.execute(
            'SELECT id, verification_status, created_at FROM kyc_verification WHERE user_id = %s ORDER BY created_at DESC LIMIT 1',
            (user_id,)
        )
        kyc_record = cursor.fetchone()
        
        if not kyc_record:
            return jsonify({'success': False, 'error': 'No KYC record found'})
        
        # Get documents
        cursor.execute(
            'SELECT document_type, file_name, uploaded_at FROM documents WHERE user_id = %s ORDER BY uploaded_at DESC',
            (user_id,)
        )
        documents = cursor.fetchall()
        
        return jsonify({
            'success': True,
            'kyc_id': kyc_record['id'],
            'status': kyc_record['verification_status'],
            'submitted_at': kyc_record['created_at'],
            'documents': documents
        })
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
               a.account_number, a.account_type, a.balance,
               CASE 
                   WHEN (SELECT verification_status FROM kyc_verification WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1) = 'verified' THEN 'active'
                   ELSE 'inactive'
               END as status
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
            '''INSERT INTO transactions (account_id, transaction_type, amount, before_balance, balance_after,
               transaction_id, description, status, created_at)
               VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW())''',
            (account['id'], 'deposit', amount, account['balance'], new_balance, transaction_id, f'Cash deposit to account {account["account_number"]}', 'completed')
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
            '''SELECT t.transaction_id, t.transaction_type, t.amount, t.before_balance, t.balance_after, 
               t.description, t.status, t.error_code, t.created_at,
               CASE 
                   WHEN t.error_code IS NOT NULL THEN CONCAT(t.description, ' - Error: ', t.error_code)
                   ELSE t.description
               END as full_description
               FROM transactions t 
               WHERE t.account_id IN (SELECT id FROM accounts WHERE user_id = %s)
               ORDER BY t.created_at DESC LIMIT 50''',
            (user_id,)
        )
        transactions = cursor.fetchall()
        
        # Replace description with full_description for failed transactions
        for txn in transactions:
            if txn['error_code']:
                txn['description'] = txn['full_description']
            txn.pop('full_description', None)
        
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

@app.route('/api/manager/transactions', methods=['GET'])
def get_all_transactions():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        cursor.execute(
            '''SELECT t.id, t.transaction_id, t.transaction_type, t.amount, t.status, t.error_code, t.created_at,
               u.full_name as customer_name, u.email as customer_email
               FROM transactions t 
               JOIN accounts a ON t.account_id = a.id
               JOIN users u ON a.user_id = u.id
               ORDER BY t.created_at DESC LIMIT 100'''
        )
        transactions = cursor.fetchall()
        
        return jsonify({
            'success': True,
            'transactions': transactions
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})
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

@app.route('/api/manager/kyc-approve', methods=['POST'])
def approve_kyc():
    data = request.json
    kyc_id = data.get('kyc_id')
    manager_id = data.get('manager_id')
    reason = data.get('reason', 'KYC documents verified')
    
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        # Get KYC record and user info
        cursor.execute('SELECT user_id FROM kyc_verification WHERE id = %s', (kyc_id,))
        kyc_record = cursor.fetchone()
        
        if not kyc_record:
            return jsonify({'success': False, 'error': 'KYC record not found'})
        
        user_id = kyc_record['user_id']
        
        # Update KYC status to verified
        cursor.execute(
            'UPDATE kyc_verification SET verification_status = %s, verified_at = NOW(), manager_notes = %s WHERE id = %s',
            ('verified', reason, kyc_id)
        )
        
        # Create bank account for the user
        import random
        account_number = f"ACC{random.randint(1000000000, 9999999999)}"
        
        cursor.execute(
            '''INSERT INTO accounts (user_id, account_number, account_type, balance, ifsc_code, branch_name, created_at)
               VALUES (%s, %s, %s, %s, %s, %s, NOW())''',
            (user_id, account_number, 'Savings', 0.00, 'BSAI0001234', 'BankSecure AI Main Branch')
        )
        
        # Update user role to verified_customer
        cursor.execute('UPDATE users SET role = %s WHERE id = %s', ('verified_customer', user_id))
        
        conn.commit()
        
        return jsonify({
            'success': True,
            'message': f'KYC approved successfully. Account {account_number} created for user.'
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})
    finally:
        conn.close()

@app.route('/api/manager/kyc-reject', methods=['POST'])
def reject_kyc():
    data = request.json
    kyc_id = data.get('kyc_id')
    manager_id = data.get('manager_id')
    reason = data.get('reason')
    
    if not reason:
        return jsonify({'success': False, 'error': 'Rejection reason is required'})
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Update KYC status to rejected
        cursor.execute(
            'UPDATE kyc_verification SET verification_status = %s, verified_at = NOW(), manager_notes = %s WHERE id = %s',
            ('rejected', reason, kyc_id)
        )
        
        conn.commit()
        
        return jsonify({
            'success': True,
            'message': 'KYC application rejected successfully.'
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})
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
def transfer():
    try:
        from npci_simulator import NPCISimulator
        
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'transaction_id': 'N/A',
                'status': 'INVALID_REQUEST',
                'message': 'Invalid request data',
                'timestamp': datetime.now().isoformat(),
                'requires_complaint': False
            })
        
        user_id = data.get('user_id')
        receiver_account = data.get('receiverAccount')
        receiver_name = data.get('receiverName')
        amount = float(data.get('amount', 0))
        
        if not all([user_id, receiver_account, receiver_name]) or amount <= 0:
            return jsonify({
                'success': False,
                'transaction_id': 'N/A',
                'status': 'INVALID_INPUT',
                'message': 'Missing required fields or invalid amount',
                'timestamp': datetime.now().isoformat(),
                'requires_complaint': False
            })
        
        npci = NPCISimulator()
        result = npci.process_transaction(user_id, receiver_account, amount, receiver_name)
        
        # Ensure result has all required fields
        if not isinstance(result, dict):
            return jsonify({
                'success': False,
                'transaction_id': 'N/A',
                'status': 'SYSTEM_ERROR',
                'message': 'Internal system error occurred',
                'timestamp': datetime.now().isoformat(),
                'requires_complaint': False
            })
        
        return jsonify(result)
        
    except Exception as e:
        print(f"Transfer error: {e}")
        import traceback
        traceback.print_exc()
        
        return jsonify({
            'success': False,
            'transaction_id': 'N/A',
            'status': 'SYSTEM_ERROR',
            'message': f'System error: {str(e)}',
            'timestamp': datetime.now().isoformat(),
            'requires_complaint': False
        })

@app.route('/api/external-accounts', methods=['GET'])
def get_external_accounts():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        cursor.execute('SELECT account_number, account_holder_name, bank_name, status, balance FROM external_accounts ORDER BY account_number')
        accounts = cursor.fetchall()
        
        return jsonify({
            'success': True,
            'accounts': accounts,
            'total_count': len(accounts)
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})
    finally:
        conn.close()

@app.route('/api/external-accounts/seed', methods=['POST'])
def seed_external_accounts():
    """Seed external accounts with various statuses for testing"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Sample external accounts with different statuses
        accounts = [
            ('1234567890', 'John Doe', 'State Bank of India', 'SBIN0001234', 'active', 50000.00),
            ('9876543210', 'Jane Smith', 'HDFC Bank', 'HDFC0001234', 'blocked', 25000.00),
            ('5555666677', 'Mike Johnson', 'ICICI Bank', 'ICIC0001234', 'inactive', 15000.00),
            ('1111222233', 'Sarah Wilson', 'Axis Bank', 'UTIB0001234', 'active', 75000.00),
            ('4444555566', 'David Brown', 'Punjab National Bank', 'PUNB0001234', 'blocked', 30000.00),
            ('7777888899', 'Lisa Davis', 'Canara Bank', 'CNRB0001234', 'inactive', 20000.00),
            ('3333444455', 'Robert Taylor', 'Bank of Baroda', 'BARB0001234', 'active', 60000.00),
            ('6666777788', 'Emily Anderson', 'Union Bank of India', 'UBIN0001234', 'blocked', 40000.00)
        ]
        
        for account in accounts:
            cursor.execute(
                '''INSERT IGNORE INTO external_accounts 
                   (account_number, account_holder_name, bank_name, ifsc_code, status, balance) 
                   VALUES (%s, %s, %s, %s, %s, %s)''',
                account
            )
        
        conn.commit()
        return jsonify({'success': True, 'message': 'External accounts seeded successfully'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})
    finally:
        conn.close()

@app.route('/api/external-accounts/update-status', methods=['POST'])
def update_account_status():
    data = request.json
    account_number = data.get('account_number')
    new_status = data.get('status')
    
    if new_status not in ['active', 'inactive', 'blocked']:
        return jsonify({'success': False, 'message': 'Invalid status'})
    
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute('UPDATE external_accounts SET status = %s WHERE account_number = %s', (new_status, account_number))
        
        if cursor.rowcount > 0:
            conn.commit()
            return jsonify({'success': True, 'message': f'Account status updated to {new_status}'})
        else:
            return jsonify({'success': False, 'message': 'Account not found'})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})
    finally:
        conn.close()

@app.route('/api/validate-account', methods=['POST'])
def validate_account():
    data = request.json
    account_number = data.get('account_number')
    
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        cursor.execute('SELECT account_holder_name, bank_name, status, balance FROM external_accounts WHERE account_number = %s', (account_number,))
        account = cursor.fetchone()
        
        if account:
            # Check account status
            if account['status'] == 'blocked':
                return jsonify({
                    'success': False,
                    'message': 'Account is blocked and cannot receive transfers',
                    'status': 'blocked'
                })
            elif account['status'] == 'inactive':
                return jsonify({
                    'success': False,
                    'message': 'Account is inactive and cannot receive transfers',
                    'status': 'inactive'
                })
            
            return jsonify({
                'success': True,
                'account_holder_name': account['account_holder_name'],
                'bank_name': account['bank_name'],
                'status': account['status'],
                'balance': float(account['balance'])
            })
        else:
            return jsonify({'success': False, 'message': 'Account not found'})
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

@app.route('/api/complaints/<complaint_id>/track', methods=['GET'])
def track_complaint(complaint_id):
    """Track complaint processing status with detailed steps"""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        # Get complaint details
        cursor.execute(
            '''SELECT c.*, t.amount, t.before_balance, t.balance_after, t.error_code as txn_error_code
               FROM complaints c 
               LEFT JOIN transactions t ON c.transaction_id = t.transaction_id 
               WHERE c.complaint_id = %s''',
            (complaint_id,)
        )
        complaint = cursor.fetchone()
        
        if not complaint:
            return jsonify({'success': False, 'message': 'Complaint not found'})
        
        # Get processing steps from complaint resolution notes
        processing_steps = []
        
        if complaint['status'] == 'processing':
            processing_steps = [
                {'step': 1, 'title': 'Complaint Received', 'status': 'completed', 'message': f'Complaint {complaint_id} registered successfully'},
                {'step': 2, 'title': 'AI Agent Assigned', 'status': 'in_progress', 'message': 'LangGraph Complaint Agent is analyzing your case'},
                {'step': 3, 'title': 'Transaction Verification', 'status': 'pending', 'message': 'Checking transaction details and debit status'},
                {'step': 4, 'title': 'Account Validation', 'status': 'pending', 'message': 'Validating sender and receiver accounts'},
                {'step': 5, 'title': 'Refund Processing', 'status': 'pending', 'message': 'Processing refund if eligible'}
            ]
        elif complaint['status'] == 'resolved':
            processing_steps = [
                {'step': 1, 'title': 'Complaint Received', 'status': 'completed', 'message': f'Complaint {complaint_id} registered successfully'},
                {'step': 2, 'title': 'AI Agent Processing', 'status': 'completed', 'message': 'LangGraph agent completed analysis'},
                {'step': 3, 'title': 'Transaction Verified', 'status': 'completed', 'message': f'Transaction {complaint["transaction_id"]} verified - Amount ₹{complaint["amount"]} was debited'},
                {'step': 4, 'title': 'Accounts Validated', 'status': 'completed', 'message': 'Sender and receiver accounts validated successfully'},
                {'step': 5, 'title': 'Refund Completed', 'status': 'completed', 'message': f'Refund of ₹{complaint["amount"]} processed successfully'}
            ]
        
        return jsonify({
            'success': True,
            'complaint': complaint,
            'processing_steps': processing_steps,
            'current_status': complaint['status']
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})
    finally:
        conn.close()

@app.route('/api/complaints/process/<complaint_id>', methods=['POST'])
def process_complaint(complaint_id):
    from agents.complaint_agent_langgraph import ComplaintAgentLangGraph
    
    agent = ComplaintAgentLangGraph()
    result = agent.process_complaint(complaint_id)
    
    return jsonify(result)

@app.route('/api/complaint', methods=['POST'])
def submit_complaint():
    data = request.json
    user_id = data.get('user_id')
    transaction_id = data.get('transactionId')
    issue_description = data.get('issue')
    
    if not all([user_id, transaction_id, issue_description]):
        return jsonify({'success': False, 'message': 'Missing required fields'})
    
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        # Verify transaction exists and get error code
        cursor.execute('SELECT error_code, amount, status FROM transactions WHERE transaction_id = %s AND account_id IN (SELECT id FROM accounts WHERE user_id = %s)', 
                      (transaction_id, user_id))
        transaction = cursor.fetchone()
        
        if not transaction:
            return jsonify({'success': False, 'message': 'Transaction not found'})
        
        # Generate complaint ID
        import random
        complaint_id = f"CMP{random.randint(100000, 999999)}"
        
        # Determine priority based on error code
        error_code = transaction.get('error_code')
        if error_code in ['S31', 'S22']:
            priority = 'critical'
        elif error_code in ['U20', 'T01', 'U18', 'T06']:
            priority = 'high'
        elif error_code in ['R05', 'R30', 'U28']:
            priority = 'medium'
        else:
            priority = 'low'
        
        # Insert complaint
        cursor.execute(
            '''INSERT INTO complaints (complaint_id, user_id, transaction_id, error_code, 
               issue_description, priority, status, created_at) 
               VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())''',
            (complaint_id, user_id, transaction_id, error_code, issue_description, priority, 'processing')
        )
        
        conn.commit()
        conn.close()  # Close connection to ensure commit is flushed
        
        print(f"\n" + "="*80)
        print(f"[COMPLAINT SYSTEM] NEW COMPLAINT RECEIVED")
        print(f"[COMPLAINT ID] {complaint_id}")
        print(f"[USER ID] {user_id}")
        print(f"[TRANSACTION ID] {transaction_id}")
        print(f"[ERROR CODE] {error_code}")
        print(f"[PRIORITY] {priority}")
        print(f"[STATUS] Processing - AI Agent will handle this complaint")
        print("="*80)
        
        # Start background processing with LangGraph agent
        import threading
        def process_complaint_background():
            try:
                print(f"\n[BACKGROUND AGENT] Starting complaint processing for {complaint_id}")
                from agents.complaint_agent_langgraph import ComplaintAgentLangGraph
                agent = ComplaintAgentLangGraph()
                agent.process_complaint(complaint_id, issue_description)
            except Exception as e:
                print(f"[ERROR] Agent processing failed: {e}")
        
        # Start agent processing in background
        thread = threading.Thread(target=process_complaint_background)
        thread.daemon = True
        thread.start()
        
        return jsonify({
            'success': True,
            'message': f'Complaint submitted successfully!',
            'complaint_id': complaint_id,
            'transaction_id': transaction_id,
            'amount': float(transaction['amount']),
            'status': 'processing',
            'priority': priority,
            'error_code': error_code,
            'tracking_message': f'Your complaint {complaint_id} for transaction {transaction_id} (₹{transaction["amount"]}) is being processed by our AI agent.',
            'show_tracking_button': True,
            'tracking_url': f'/complaints/{complaint_id}/track'
        })
    
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})

def process_complaint_ai(complaint_id, error_code, transaction, cursor, conn):
    """AI agent processes complaint automatically"""
    
    # Auto-refund errors (money was debited)
    if error_code in ['S31', 'U20', 'T01', 'S05', 'U18', 'T06', 'S22']:
        # Process immediate refund
        amount = float(transaction['amount'])
        
        # Get user account from complaint
        cursor.execute('SELECT user_id FROM complaints WHERE complaint_id = %s', (complaint_id,))
        user_data = cursor.fetchone()
        
        if user_data:
            # Credit back the amount
            cursor.execute('UPDATE accounts SET balance = balance + %s WHERE user_id = %s', 
                         (amount, user_data['user_id']))
            
            # Create refund transaction
            refund_txn_id = f"REF{int(time.time())}{random.randint(100, 999)}"
            
            # Get current balance for refund transaction
            cursor.execute('SELECT balance FROM accounts WHERE user_id = %s', (user_data['user_id'],))
            current_balance_data = cursor.fetchone()
            current_balance = float(current_balance_data['balance']) if current_balance_data else 0.0
            new_balance_after_refund = current_balance + amount
            
            cursor.execute(
                '''INSERT INTO transactions (account_id, transaction_type, amount, before_balance, balance_after,
                   transaction_id, description, status, created_at) VALUES 
                   ((SELECT id FROM accounts WHERE user_id = %s), 'refund', %s, %s, %s, %s, %s, 'completed', NOW())''',
                (user_data['user_id'], amount, current_balance, new_balance_after_refund, refund_txn_id, f'Auto-refund for complaint {complaint_id}')
            )
            
            # Update complaint status
            cursor.execute(
                '''UPDATE complaints SET status = 'resolved', resolution_notes = %s, 
                   refund_transaction_id = %s, resolved_at = NOW() WHERE complaint_id = %s''',
                (f'Auto-refund processed. Amount ₹{amount} credited back.', refund_txn_id, complaint_id)
            )
            
            conn.commit()
            
            return {
                'status': 'resolved',
                'message': f'Auto-refund of ₹{amount} processed successfully',
                'tracking_id': complaint_id,
                'next_steps': [
                    'Refund completed automatically',
                    'Amount credited to your account',
                    'Transaction reversed successfully'
                ]
            }
    
    # No refund needed (money wasn't debited)
    elif error_code in ['S10', 'U14', 'C01', 'C02', 'C03', 'C05']:
        cursor.execute(
            '''UPDATE complaints SET status = 'resolved', resolution_notes = %s, resolved_at = NOW() 
               WHERE complaint_id = %s''',
            ('No refund needed as money was not debited from your account.', complaint_id)
        )
        conn.commit()
        
        return {
            'status': 'resolved',
            'message': 'No refund needed - money was not debited',
            'tracking_id': complaint_id,
            'next_steps': [
                'Transaction failed before debit',
                'Your account balance is safe',
                'You can retry the transaction'
            ]
        }
    
    # Escalate complex cases
    else:
        cursor.execute(
            '''UPDATE complaints SET status = 'escalated', ai_analysis = %s WHERE complaint_id = %s''',
            (f'Escalated to manual review team for error code {error_code}', complaint_id)
        )
        conn.commit()
        
        return {
            'status': 'escalated',
            'message': 'Complaint escalated to specialist team',
            'tracking_id': complaint_id,
            'next_steps': [
                'Manual review in progress',
                'Specialist team assigned',
                'Resolution within 2-3 business days'
            ]
        }

@app.route('/api/complaints/<int:user_id>', methods=['GET'])
def get_user_complaints(user_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        cursor.execute(
            '''SELECT c.*, t.amount FROM complaints c 
               LEFT JOIN transactions t ON c.transaction_id = t.transaction_id 
               WHERE c.user_id = %s ORDER BY c.created_at DESC''',
            (user_id,)
        )
        complaints = cursor.fetchall()
        
        return jsonify({
            'success': True,
            'complaints': complaints
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})
    finally:
        conn.close()

@app.route('/api/manager/complaints', methods=['GET'])
def get_all_complaints():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        cursor.execute(
            '''SELECT c.complaint_id, c.transaction_id, c.error_code, c.issue_description, 
               c.status, c.priority, c.created_at, c.resolved_at, c.resolution_notes,
               u.full_name as customer_name, u.email as customer_email,
               t.amount
               FROM complaints c 
               JOIN users u ON c.user_id = u.id
               LEFT JOIN transactions t ON c.transaction_id = t.transaction_id 
               ORDER BY c.created_at DESC'''
        )
        complaints = cursor.fetchall()
        
        return jsonify({
            'success': True,
            'complaints': complaints
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})
    finally:
        conn.close()

@app.route('/api/manager/manual-review', methods=['GET'])
def get_manual_review_transactions():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        cursor.execute(
            '''SELECT c.complaint_id, c.transaction_id, c.error_code, c.issue_description, 
               c.created_at, u.full_name as customer_name, t.amount
               FROM complaints c 
               JOIN users u ON c.user_id = u.id
               LEFT JOIN transactions t ON c.transaction_id = t.transaction_id 
               WHERE c.status = 'escalated'
               ORDER BY c.created_at DESC'''
        )
        manual_reviews = cursor.fetchall()
        
        return jsonify({
            'success': True,
            'manual_reviews': manual_reviews
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})
    finally:
        conn.close()

@app.route('/api/manager/customers', methods=['GET'])
def get_customers_count():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        cursor.execute('SELECT COUNT(*) as total_count FROM users WHERE role IN ("customer", "verified_customer")')
        result = cursor.fetchone()
        
        return jsonify({
            'success': True,
            'total_count': result['total_count'] if result else 0
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})
    finally:
        conn.close()

@app.route('/api/manager/kyc-documents/<int:kyc_id>', methods=['GET'])
def get_kyc_documents_by_id(kyc_id):
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        # Get KYC record
        cursor.execute('SELECT * FROM kyc_verification WHERE id = %s', (kyc_id,))
        kyc_record = cursor.fetchone()
        
        if not kyc_record:
            return jsonify({'success': False, 'error': 'KYC record not found'})
        
        # Get documents
        cursor.execute(
            'SELECT document_type, file_name, file_path, uploaded_at FROM documents WHERE kyc_id = %s ORDER BY uploaded_at DESC',
            (kyc_id,)
        )
        documents = cursor.fetchall()
        
        # Format document URLs
        for doc in documents:
            if doc['file_path']:
                doc['file_url'] = f'http://localhost:5000/uploads/{os.path.basename(doc["file_path"])}'
        
        return jsonify({
            'success': True,
            'kyc_id': kyc_id,
            'status': kyc_record['verification_status'],
            'documents': documents
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})
    finally:
        conn.close()

@app.route('/api/manager/refund', methods=['POST'])
def process_refund():
    data = request.json
    complaint_id = data.get('complaint_id')
    
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        # Get complaint and transaction details
        cursor.execute(
            '''SELECT c.user_id, c.transaction_id, t.amount 
               FROM complaints c 
               LEFT JOIN transactions t ON c.transaction_id = t.transaction_id 
               WHERE c.complaint_id = %s''',
            (complaint_id,)
        )
        complaint_data = cursor.fetchone()
        
        if not complaint_data or not complaint_data['transaction_id']:
            return jsonify({'success': False, 'message': 'Complaint or transaction not found'})
        
        amount = float(complaint_data['amount'])
        user_id = complaint_data['user_id']
        transaction_id = complaint_data['transaction_id']
        
        # Credit back the amount
        cursor.execute('UPDATE accounts SET balance = balance + %s WHERE user_id = %s', 
                      (amount, user_id))
        
        # Get current balance before refund
        cursor.execute('SELECT balance FROM accounts WHERE user_id = %s', (user_id,))
        current_balance_data = cursor.fetchone()
        current_balance = float(current_balance_data['balance']) if current_balance_data else 0.0
        new_balance_after_refund = current_balance
        
        # Create refund transaction
        import random
        refund_txn_id = f"REF{int(time.time())}{random.randint(100, 999)}"
        
        cursor.execute(
            '''INSERT INTO transactions (account_id, transaction_type, amount, before_balance, balance_after,
               transaction_id, description, status, created_at) VALUES 
               ((SELECT id FROM accounts WHERE user_id = %s), 'refund', %s, %s, %s, %s, %s, 'completed', NOW())''',
            (user_id, amount, current_balance - amount, new_balance_after_refund, refund_txn_id, f'Refund for complaint {complaint_id}')
        )
        
        # Update complaint status
        cursor.execute(
            '''UPDATE complaints SET status = 'resolved', resolution_notes = %s, 
               refund_transaction_id = %s, resolved_at = NOW() WHERE complaint_id = %s''',
            (f'Refund processed. Amount ₹{amount} credited back.', refund_txn_id, complaint_id)
        )
        
        conn.commit()
        
        return jsonify({
            'success': True,
            'message': f'Refund of ₹{amount} processed successfully.',
            'refund_transaction_id': refund_txn_id
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})
    finally:
        conn.close()

@app.route('/api/extract-document', methods=['POST'])
def extract_document():
    """Extract data from uploaded document using OCR"""
    try:
        if 'file' not in request.files:
            return jsonify({'success': False, 'error': 'No file provided'})
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'success': False, 'error': 'No file selected'})
        
        # Save file temporarily
        filename = secure_filename(file.filename)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S_')
        unique_filename = f"extract_{timestamp}{filename}"
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
        file.save(file_path)
        
        extracted_data = {}
        
        try:
            import easyocr
            import fitz  # PyMuPDF
            
            reader = easyocr.Reader(['en'])
            ocr_text = ""
            
            # Handle PDF files
            if file_path.lower().endswith('.pdf'):
                doc = fitz.open(file_path)
                for page in doc:
                    pix = page.get_pixmap()
                    img_data = pix.tobytes("ppm")
                    result = reader.readtext(img_data)
                    ocr_text += " ".join([text[1] for text in result]) + "\n"
                doc.close()
            else:
                # Handle image files
                result = reader.readtext(file_path)
                ocr_text = " ".join([text[1] for text in result])
            
            # Use AI to extract structured data
            try:
                import google.generativeai as genai
                genai.configure(api_key=os.getenv('GEMINI_API_KEY'))
                model = genai.GenerativeModel('gemini-pro')
                
                prompt = f"""
                Extract the following information from this OCR text:
                
                OCR Text: {ocr_text}
                
                Please extract and return ONLY:
                1. Aadhaar Number (12 digits)
                2. PAN Number (format: ABCDE1234F)
                3. Full Name
                
                Return in this exact JSON format:
                {{
                    "aadhaar": "123456789012",
                    "pan": "ABCDE1234F",
                    "name": "FULL NAME"
                }}
                
                If any field is not found, use null. Only return the JSON, no other text.
                """
                
                ai_result = model.generate_content(prompt).text.strip()
                
                # Parse AI response
                import json
                try:
                    ai_data = json.loads(ai_result)
                    extracted_data = {
                        'aadhaar': ai_data.get('aadhaar'),
                        'pan': ai_data.get('pan'),
                        'name': ai_data.get('name')
                    }
                except json.JSONDecodeError:
                    # Fallback regex extraction
                    import re
                    aadhaar_pattern = r'\b\d{4}\s*\d{4}\s*\d{4}\b'
                    pan_pattern = r'\b[A-Z]{5}\d{4}[A-Z]\b'
                    
                    aadhaar_match = re.search(aadhaar_pattern, ocr_text)
                    pan_match = re.search(pan_pattern, ocr_text.upper())
                    
                    extracted_data = {
                        'aadhaar': re.sub(r'\D', '', aadhaar_match.group()) if aadhaar_match else None,
                        'pan': pan_match.group() if pan_match else None,
                        'name': None
                    }
            except Exception as e:
                print(f"AI extraction failed: {e}")
                # Fallback regex extraction
                import re
                aadhaar_pattern = r'\b\d{4}\s*\d{4}\s*\d{4}\b'
                pan_pattern = r'\b[A-Z]{5}\d{4}[A-Z]\b'
                
                aadhaar_match = re.search(aadhaar_pattern, ocr_text)
                pan_match = re.search(pan_pattern, ocr_text.upper())
                
                extracted_data = {
                    'aadhaar': re.sub(r'\D', '', aadhaar_match.group()) if aadhaar_match else None,
                    'pan': pan_match.group() if pan_match else None,
                    'name': None
                }
            
            # Clean up temp file
            if os.path.exists(file_path):
                os.remove(file_path)
            
            return jsonify({
                'success': True,
                'extracted_data': extracted_data,
                'ocr_text': ocr_text[:500]  # Return first 500 chars for preview
            })
            
        except Exception as e:
            # Clean up temp file
            if os.path.exists(file_path):
                os.remove(file_path)
            return jsonify({'success': False, 'error': f'OCR extraction failed: {str(e)}'})
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})

@app.route('/api/create-account', methods=['POST'])
def create_account():
    """Create bank account for user after profile completion"""
    data = request.json
    user_id = data.get('user_id')
    
    if not user_id:
        return jsonify({'success': False, 'error': 'User ID required'})
    
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        # Check if account already exists
        cursor.execute('SELECT id FROM accounts WHERE user_id = %s', (user_id,))
        existing_account = cursor.fetchone()
        
        if existing_account:
            return jsonify({
                'success': True,
                'message': 'Account already exists',
                'account_id': existing_account['id']
            })
        
        # Check if profile is complete
        cursor.execute('SELECT * FROM profiles WHERE user_id = %s', (user_id,))
        profile = cursor.fetchone()
        
        if not profile:
            return jsonify({'success': False, 'error': 'Profile not found. Please complete your profile first.'})
        
        # Generate account number
        import random
        account_number = f"{random.randint(1000000000, 9999999999)}"
        ifsc_code = "BANK0001234"
        branch_name = "Main Branch"
        
        # Create account
        cursor.execute(
            '''INSERT INTO accounts (user_id, account_number, account_type, balance, ifsc_code, branch_name, created_at)
               VALUES (%s, %s, %s, %s, %s, %s, NOW())''',
            (user_id, account_number, 'Savings', 0.0, ifsc_code, branch_name)
        )
        
        account_id = cursor.lastrowid
        
        # Update user role
        cursor.execute('UPDATE users SET role = %s WHERE id = %s', ('verified_customer', user_id))
        
        conn.commit()
        
        return jsonify({
            'success': True,
            'message': 'Account created successfully',
            'account_number': account_number,
            'ifsc_code': ifsc_code,
            'branch_name': branch_name,
            'account_id': account_id
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})
    finally:
        conn.close()

@app.route('/api/manager/complaints/<complaint_id>/resolve', methods=['POST'])
def resolve_complaint_manual():
    data = request.json
    complaint_id = data.get('complaint_id') or complaint_id
    resolution_notes = data.get('resolution_notes')
    refund_amount = float(data.get('refund_amount', 0))
    
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        # Get complaint details
        cursor.execute(
            '''SELECT c.user_id, c.transaction_id, t.amount 
               FROM complaints c 
               LEFT JOIN transactions t ON c.transaction_id = t.transaction_id 
               WHERE c.complaint_id = %s''',
            (complaint_id,)
        )
        complaint_data = cursor.fetchone()
        
        if not complaint_data:
            return jsonify({'success': False, 'message': 'Complaint not found'})
        
        user_id = complaint_data['user_id']
        transaction_id = complaint_data['transaction_id']
        
        # Process refund if amount > 0
        refund_txn_id = None
        if refund_amount > 0:
            # Credit back the amount
            cursor.execute('UPDATE accounts SET balance = balance + %s WHERE user_id = %s', 
                          (refund_amount, user_id))
            
            # Create refund transaction
            import random
            refund_txn_id = f"REF{int(time.time())}{random.randint(100, 999)}"
            
            cursor.execute(
                '''INSERT INTO transactions (account_id, transaction_type, amount, transaction_id, 
                   description, status, created_at) VALUES 
                   ((SELECT id FROM accounts WHERE user_id = %s), 'refund', %s, %s, %s, 'completed', NOW())''',
                (user_id, refund_amount, refund_txn_id, f'Manual refund for complaint {complaint_id}')
            )
        
        # Update complaint status
        cursor.execute(
            '''UPDATE complaints SET status = 'resolved', resolution_notes = %s, 
               refund_transaction_id = %s, resolved_at = NOW() WHERE complaint_id = %s''',
            (resolution_notes, refund_txn_id, complaint_id)
        )
        
        conn.commit()
        
        message = f'Complaint resolved successfully.'
        if refund_amount > 0:
            message += f' Refund of ₹{refund_amount} processed.'
        
        return jsonify({
            'success': True,
            'message': message,
            'refund_transaction_id': refund_txn_id
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})
    finally:
        conn.close()
    data = request.json
    complaint_id = data.get('complaint_id')
    
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        # Get complaint and transaction details
        cursor.execute(
            '''SELECT c.user_id, c.transaction_id, t.amount 
               FROM complaints c 
               LEFT JOIN transactions t ON c.transaction_id = t.transaction_id 
               WHERE c.complaint_id = %s''',
            (complaint_id,)
        )
        complaint_data = cursor.fetchone()
        
        if not complaint_data or not complaint_data['transaction_id']:
            return jsonify({'success': False, 'message': 'Complaint or transaction not found'})
        
        amount = float(complaint_data['amount'])
        user_id = complaint_data['user_id']
        transaction_id = complaint_data['transaction_id']
        
        # Credit back the amount
        cursor.execute('UPDATE accounts SET balance = balance + %s WHERE user_id = %s', 
                      (amount, user_id))
        
        # Create refund transaction
        import random
        refund_txn_id = f"REF{int(time.time())}{random.randint(100, 999)}"
        
        # Get current balance before refund
        cursor.execute('SELECT balance FROM accounts WHERE user_id = %s', (user_id,))
        current_balance_data = cursor.fetchone()
        current_balance = float(current_balance_data['balance']) if current_balance_data else 0.0
        new_balance_after_refund = current_balance + amount
        
        cursor.execute(
            '''INSERT INTO transactions (account_id, transaction_type, amount, before_balance, balance_after,
               transaction_id, description, status, created_at) VALUES 
               ((SELECT id FROM accounts WHERE user_id = %s), 'refund', %s, %s, %s, %s, %s, 'completed', NOW())''',
            (user_id, amount, current_balance, new_balance_after_refund, refund_txn_id, f'Manual refund for complaint {complaint_id}')
        )
        
        # Update original transaction status
        cursor.execute(
            '''UPDATE transactions SET status = 'refunded', 
               description = CONCAT(COALESCE(description, ''), ' - Manual refund processed') 
               WHERE transaction_id = %s''',
            (transaction_id,)
        )
        
        # Update complaint status
        cursor.execute(
            '''UPDATE complaints SET status = 'resolved', resolution_notes = %s, 
               refund_transaction_id = %s, resolved_at = NOW() WHERE complaint_id = %s''',
            (f'Manual refund processed. Amount ₹{amount} credited back.', refund_txn_id, complaint_id)
        )
        
        conn.commit()
        
        return jsonify({
            'success': True,
            'message': f'Refund of ₹{amount} processed successfully. Transaction {transaction_id} updated to refunded.',
            'refund_transaction_id': refund_txn_id,
            'original_transaction_id': transaction_id
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)})
    finally:
        conn.close()

@app.route('/api/test/check-transaction/<transaction_id>', methods=['GET'])
def check_transaction_status(transaction_id):
    """Check specific transaction status"""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        cursor.execute('SELECT * FROM transactions WHERE transaction_id = %s', (transaction_id,))
        transaction = cursor.fetchone()
        
        if not transaction:
            return jsonify({'success': False, 'message': 'Transaction not found'})
        
        cursor.execute('SELECT * FROM complaints WHERE transaction_id = %s', (transaction_id,))
        complaint = cursor.fetchone()
        
        return jsonify({
            'success': True,
            'transaction': transaction,
            'complaint': complaint
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})
    finally:
        conn.close()

@app.route('/api/test/fix-transaction/<transaction_id>', methods=['POST'])
def fix_transaction_status(transaction_id):
    """Fix transaction status to refunded"""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        cursor.execute(
            '''UPDATE transactions SET status = 'refunded', 
               description = CONCAT(COALESCE(description, ''), ' - Manual refund processed') 
               WHERE transaction_id = %s''',
            (transaction_id,)
        )
        
        if cursor.rowcount > 0:
            conn.commit()
            return jsonify({'success': True, 'message': f'Transaction {transaction_id} updated to refunded'})
        else:
            return jsonify({'success': False, 'message': 'Transaction not found'})
            
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})
    finally:
        conn.close()

@app.route('/api/test/create-escalated-complaints', methods=['POST'])
def create_test_escalated_complaints():
    """Create test escalated complaints for manual review demo"""
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        # Get some users and create test transactions and complaints
        cursor.execute('SELECT id, full_name FROM users WHERE role = "customer" LIMIT 3')
        users = cursor.fetchall()
        
        if not users:
            return jsonify({'success': False, 'message': 'No customer users found'})
        
        test_complaints = []
        
        for i, user in enumerate(users):
            # Create a failed transaction
            txn_id = f"TXN{int(time.time())}{random.randint(100, 999)}"
            amount = random.choice([5000, 15000, 25000])
            error_code = random.choice(['R30', 'R13', 'S22'])
            
            cursor.execute(
                '''INSERT INTO transactions (account_id, transaction_type, amount, transaction_id, 
                   description, status, error_code, created_at) VALUES 
                   ((SELECT id FROM accounts WHERE user_id = %s), 'failed_transfer', %s, %s, %s, 'failed', %s, NOW())''',
                (user['id'], amount, txn_id, f'Failed transfer - Error {error_code}', error_code)
            )
            
            # Create escalated complaint
            complaint_id = f"CMP{random.randint(100000, 999999)}"
            issue_descriptions = [
                f'Money debited but transfer failed with error {error_code}',
                f'Transaction stuck in processing state - {error_code}',
                f'Network error during transfer - amount not credited to receiver'
            ]
            
            cursor.execute(
                '''INSERT INTO complaints (complaint_id, user_id, transaction_id, error_code, 
                   issue_description, priority, status, created_at) 
                   VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())''',
                (complaint_id, user['id'], txn_id, error_code, issue_descriptions[i], 'high', 'escalated')
            )
            
            test_complaints.append({
                'complaint_id': complaint_id,
                'customer': user['full_name'],
                'amount': amount,
                'error_code': error_code
            })
        
        conn.commit()
        
        return jsonify({
            'success': True,
            'message': f'Created {len(test_complaints)} test escalated complaints',
            'complaints': test_complaints
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
            return jsonify({
                'success': True,
                'response': 'Please type a message to get started!'
            })
        
        # RAG chatbot only
        try:
            print(f"Processing message: '{message}' for user: {user_id}")
            from agents.chatbot_agent_langgraph import ChatbotAgentLangGraph
            from rag.rag_service import RAGService
            
            rag_service = RAGService()
            chatbot = ChatbotAgentLangGraph(rag_service)
            print("Chatbot initialized, calling process_message...")
            response = chatbot.process_message(message, user_id)
            print(f"Chatbot response: {response}")
            
            return jsonify({
                'success': True,
                'response': response
            })
        except Exception as e:
            print(f"Chatbot error: {e}")
            import traceback
            traceback.print_exc()
            return jsonify({
                'success': True,
                'response': f'Error: {str(e)}'
            })
        
    except Exception as e:
        print(f"Chat error: {e}")
        return jsonify({
            'success': True,
            'response': 'Hello! I am your AI banking assistant. How can I help you today?'
        })

if __name__ == '__main__':
    app.run(debug=True, port=5000, host='0.0.0.0')