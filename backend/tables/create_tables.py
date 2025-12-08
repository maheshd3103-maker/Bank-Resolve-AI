import mysql.connector
from mysql.connector import Error

def get_db_connection():
    """Create database connection"""
    try:
        connection = mysql.connector.connect(
            host='localhost',
            user='root',
            password='root',
            database='banksecure_ai'
        )
        return connection
    except Error as e:
        print(f"Error connecting to MySQL: {e}")
        return None

def create_all_tables():
    """Create all required tables for BankSecure AI"""
    connection = get_db_connection()
    if not connection:
        return False
    
    cursor = connection.cursor()
    
    try:
        # Users table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INT AUTO_INCREMENT PRIMARY KEY,
                full_name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                role ENUM('customer', 'manager', 'admin') DEFAULT 'customer',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        """)
        
        # Profiles table
        cursor.execute("""
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
                profile_photo_path VARCHAR(500),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """)
        
        # Accounts table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS accounts (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                account_number VARCHAR(20) UNIQUE NOT NULL,
                account_type ENUM('Savings', 'Current', 'Fixed Deposit') DEFAULT 'Savings',
                balance DECIMAL(15,2) DEFAULT 0.00,
                ifsc_code VARCHAR(11) DEFAULT 'BSAI0001234',
                branch_name VARCHAR(255) DEFAULT 'BankSecure Main Branch',
                status ENUM('Active', 'Inactive', 'Frozen') DEFAULT 'Active',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """)
        
        # KYC Verification table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS kyc_verification (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                document_type VARCHAR(100),
                document_number VARCHAR(100),
                verification_status ENUM('pending', 'verified', 'rejected') DEFAULT 'pending',
                confidence_score DECIMAL(5,2),
                ai_feedback TEXT,
                verified_at TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """)
        
        # Documents table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS documents (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                kyc_id INT,
                document_type ENUM('aadhaar', 'pan', 'address_proof', 'selfie', 'other') NOT NULL,
                file_name VARCHAR(255) NOT NULL,
                file_path VARCHAR(500) NOT NULL,
                file_size BIGINT,
                mime_type VARCHAR(100),
                extracted_number VARCHAR(100),
                extracted_data TEXT,
                uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (kyc_id) REFERENCES kyc_verification(id) ON DELETE CASCADE
            )
        """)
        
        # KYC Feedback table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS kyc_feedback (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                feedback_text TEXT,
                confidence_score DECIMAL(5,2),
                ai_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """)
        
        # Transactions table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS transactions (
                id INT AUTO_INCREMENT PRIMARY KEY,
                from_account_id INT,
                to_account_id INT,
                transaction_type ENUM('deposit', 'withdrawal', 'transfer', 'payment') NOT NULL,
                amount DECIMAL(15,2) NOT NULL,
                description TEXT,
                status ENUM('pending', 'completed', 'failed', 'cancelled') DEFAULT 'pending',
                reference_number VARCHAR(50) UNIQUE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (from_account_id) REFERENCES accounts(id),
                FOREIGN KEY (to_account_id) REFERENCES accounts(id)
            )
        """)
        
        # Loans table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS loans (
                id INT AUTO_INCREMENT PRIMARY KEY,
                user_id INT NOT NULL,
                loan_type ENUM('personal', 'home', 'car', 'education', 'business') NOT NULL,
                amount DECIMAL(15,2) NOT NULL,
                interest_rate DECIMAL(5,2),
                tenure_months INT,
                status ENUM('applied', 'approved', 'rejected', 'disbursed', 'closed') DEFAULT 'applied',
                application_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                approval_date TIMESTAMP NULL,
                disbursement_date TIMESTAMP NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """)
        
        connection.commit()
        print("All tables created successfully!")
        return True
        
    except Error as e:
        print(f"Error creating tables: {e}")
        connection.rollback()
        return False
        
    finally:
        cursor.close()
        connection.close()

if __name__ == "__main__":
    create_all_tables()