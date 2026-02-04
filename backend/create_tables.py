import mysql.connector
from dotenv import load_dotenv
import os

load_dotenv()

def create_database_tables():
    try:
        # Connect to MySQL
        conn = mysql.connector.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            user=os.getenv('DB_USER', 'root'),
            password=os.getenv('DB_PASSWORD', 'root'),
            database=os.getenv('DB_NAME', 'banksecure_ai')
        )
        cursor = conn.cursor()
        
        print("Creating database tables...")
        
        # Users table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                full_name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role ENUM('customer', 'verified_customer', 'manager', 'admin') DEFAULT 'customer',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Profiles table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS profiles (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                date_of_birth DATE,
                gender ENUM('Male', 'Female', 'Other'),
                mobile_number VARCHAR(15),
                occupation VARCHAR(100),
                father_mother_name VARCHAR(255),
                marital_status ENUM('Single', 'Married', 'Divorced', 'Widowed'),
                permanent_address TEXT,
                present_address TEXT,
                pin_code VARCHAR(10),
                city VARCHAR(100),
                state VARCHAR(100),
                country VARCHAR(100) DEFAULT 'India',
                aadhaar_number VARCHAR(12),
                pan_number VARCHAR(10),
                profile_photo VARCHAR(500),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        ''')
        
        # KYC Verification table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS kyc_verification (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                document_type VARCHAR(50),
                document_number VARCHAR(100),
                verification_status ENUM('pending', 'verified', 'rejected', 'manual_review') DEFAULT 'pending',
                ai_feedback TEXT,
                confidence_score DECIMAL(3,2),
                verified_at TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        ''')
        
        # Documents table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS documents (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                kyc_id INT,
                document_type ENUM('aadhaar', 'pan', 'address_proof', 'selfie', 'other') NOT NULL,
                file_name VARCHAR(255) NOT NULL,
                file_path VARCHAR(500) NOT NULL,
                file_size BIGINT,
                mime_type VARCHAR(100),
                uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (kyc_id) REFERENCES kyc_verification(id) ON DELETE SET NULL
            )
        ''')
        
        # Accounts table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS accounts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                account_number VARCHAR(20) UNIQUE NOT NULL,
                account_type ENUM('Savings', 'Current', 'Fixed Deposit') DEFAULT 'Savings',
                balance DECIMAL(15,2) DEFAULT 0.00,
                ifsc_code VARCHAR(11) DEFAULT 'BSAI0001234',
                branch_name VARCHAR(255) DEFAULT 'BankSecure Main Branch',
                status ENUM('active', 'inactive', 'blocked') DEFAULT 'active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        ''')
        
        # Transactions table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS transactions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                account_id INT NOT NULL,
                transaction_id VARCHAR(50) UNIQUE NOT NULL,
                transaction_type ENUM('deposit', 'withdrawal', 'transfer', 'refund', 'failed_transfer') NOT NULL,
                amount DECIMAL(15,2) NOT NULL,
                before_balance DECIMAL(15,2),
                balance_after DECIMAL(15,2),
                receiver_account VARCHAR(20),
                receiver_name VARCHAR(255),
                description TEXT,
                status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
                error_code VARCHAR(10),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
            )
        ''')
        
        # External Accounts table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS external_accounts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                account_number VARCHAR(20) UNIQUE NOT NULL,
                account_holder_name VARCHAR(255) NOT NULL,
                bank_name VARCHAR(255) NOT NULL,
                ifsc_code VARCHAR(11) NOT NULL,
                status ENUM('active', 'inactive', 'blocked') DEFAULT 'active',
                balance DECIMAL(15,2) DEFAULT 0.00,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Complaints table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS complaints (
                id INT AUTO_INCREMENT PRIMARY KEY,
                complaint_id VARCHAR(20) UNIQUE NOT NULL,
                user_id INT NOT NULL,
                transaction_id VARCHAR(50),
                error_code VARCHAR(10),
                issue_description TEXT NOT NULL,
                priority ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
                status ENUM('processing', 'resolved', 'escalated', 'rejected') DEFAULT 'processing',
                ai_analysis TEXT,
                resolution_notes TEXT,
                refund_transaction_id VARCHAR(50),
                resolved_at TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        ''')
        
        # Notifications table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS notifications (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                type VARCHAR(50) NOT NULL,
                title VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                read_status BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                INDEX idx_user_notifications (user_id, created_at),
                INDEX idx_unread_notifications (user_id, read_status)
            )
        ''')
        
        conn.commit()
        print("[SUCCESS] All database tables created successfully!")
        
        # Show created tables
        cursor.execute("SHOW TABLES")
        tables = cursor.fetchall()
        print(f"\n[INFO] Created {len(tables)} tables:")
        for table in tables:
            print(f"  - {table[0]}")
        
        conn.close()
        
    except mysql.connector.Error as e:
        print(f"[ERROR] Database error: {e}")
    except Exception as e:
        print(f"[ERROR] Error: {e}")

if __name__ == "__main__":
    create_database_tables()