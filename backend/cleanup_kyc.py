import mysql.connector
import os
import shutil

def cleanup_kyc_data():
    # Database connection
    conn = mysql.connector.connect(
        host='localhost',
        user='root',
        password='root',
        database='banksecure_ai'
    )
    cursor = conn.cursor()
    
    try:
        # Clear documents records first (foreign key constraint)
        cursor.execute('DELETE FROM documents')
        print(f"Deleted {cursor.rowcount} document records")
        
        # Clear KYC verification records
        cursor.execute('DELETE FROM kyc_verification')
        print(f"Deleted {cursor.rowcount} KYC verification records")
        
        conn.commit()
        
        # Clear uploads folder
        uploads_folder = 'uploads'
        if os.path.exists(uploads_folder):
            for filename in os.listdir(uploads_folder):
                file_path = os.path.join(uploads_folder, filename)
                if os.path.isfile(file_path):
                    os.remove(file_path)
                    print(f"Deleted file: {filename}")
        
        print("KYC cleanup completed successfully")
        
    except Exception as e:
        print(f"Error during cleanup: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    cleanup_kyc_data()