import re
import mysql.connector
from datetime import datetime
import json
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

class BankingChatbotAgent:
    def __init__(self):
        self.knowledge_base = [
            {"question": "What is KYC verification?", "answer": "KYC (Know Your Customer) is a mandatory verification process where you need to submit identity documents like Aadhaar and PAN card to verify your identity and comply with banking regulations."},
            {"question": "How to transfer money?", "answer": "You can transfer money through NEFT, RTGS, or IMPS. Go to Money Transfer section, enter recipient details, amount, and confirm the transaction with your PIN."},
            {"question": "What are the loan types available?", "answer": "We offer Personal Loans (up to ₹10 lakhs), Home Loans (up to ₹1 crore), Car Loans (up to ₹50 lakhs), and Business Loans with competitive interest rates."},
            {"question": "How to block debit card?", "answer": "To block your debit card, go to Account Management > Card Services > Block Card, or call our 24/7 helpline immediately if your card is lost or stolen."},
            {"question": "What are the account types?", "answer": "We offer Savings Account (minimum balance ₹1000), Current Account (for businesses), and Fixed Deposit accounts with attractive interest rates."},
            {"question": "How to pay bills online?", "answer": "Use our Bill Payment section to pay electricity, phone, gas, water, and other utility bills. You can also set up auto-pay for recurring bills."},
            {"question": "What is IFSC code?", "answer": "IFSC (Indian Financial System Code) is an 11-digit code that identifies your bank branch for electronic fund transfers. You can find it in Account Management section."},
            {"question": "How to check transaction history?", "answer": "Go to Transaction History section in your dashboard to view all your past transactions, filter by date, and download statements."},
            {"question": "What are the interest rates?", "answer": "Savings Account: 3.5% p.a., Fixed Deposits: 5.5-7% p.a., Personal Loans: 10.5-15% p.a., Home Loans: 8.5-9.5% p.a. (rates subject to change)."},
            {"question": "How to update profile information?", "answer": "Go to Profile section, click Edit Profile, update your details like address, phone number, and save changes. Some changes may require document verification."}
        ]
        self.vectorizer = TfidfVectorizer(stop_words='english', ngram_range=(1, 2))
        self._build_knowledge_vectors()
        
        self.responses = {
            'greeting': [
                "Hello! I'm your AI banking assistant. How can I help you today?",
                "Hi there! I'm here to help with your banking needs. What can I do for you?",
                "Welcome! I'm your virtual banking assistant. How may I assist you?"
            ],
            'balance': "I can help you check your account balance. Let me fetch that information for you.",
            'transfer': "I can guide you through money transfers. What type of transfer would you like to make?",
            'bills': "I can help you with bill payments. What bill would you like to pay?",
            'loan': "I can provide information about loan applications. What type of loan are you interested in?",
            'card': "I can help with card-related services. What do you need help with regarding your card?",
            'atm': "I can help you find the nearest ATM. What's your current location?",
            'kyc': "I can help with KYC verification. Do you need to check your KYC status or submit documents?",
            'account': "I can help with account-related queries. What would you like to know about your account?",
            'default': "I understand you need help with banking services. Could you please be more specific about what you'd like to do?"
        }
    
    def get_db_connection(self):
        return mysql.connector.connect(
            host='localhost',
            user='root',
            password='root',
            database='banksecure_ai'
        )
    
    def get_user_balance(self, user_id):
        try:
            conn = self.get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute('SELECT balance FROM accounts WHERE user_id = %s', (user_id,))
            result = cursor.fetchone()
            conn.close()
            
            if result:
                return f"Your current account balance is ₹{result['balance']:.2f}"
            else:
                return "I couldn't find your account information. Please ensure your KYC is completed."
        except Exception as e:
            return "I'm having trouble accessing your account information right now. Please try again later."
    
    def get_recent_transactions(self, user_id):
        try:
            conn = self.get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute('''
                SELECT t.transaction_type, t.amount, t.description, t.created_at
                FROM transactions t 
                JOIN accounts a ON t.account_id = a.id 
                WHERE a.user_id = %s 
                ORDER BY t.created_at DESC LIMIT 3
            ''', (user_id,))
            transactions = cursor.fetchall()
            conn.close()
            
            if transactions:
                response = "Here are your recent transactions:\n"
                for txn in transactions:
                    response += f"• {txn['description']} - ₹{txn['amount']:.2f} ({txn['created_at'].strftime('%d %b %Y')})\n"
                return response
            else:
                return "You don't have any recent transactions."
        except Exception as e:
            return "I couldn't retrieve your transaction history right now."
    
    def get_kyc_status(self, user_id):
        try:
            conn = self.get_db_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute('''
                SELECT verification_status FROM kyc_verification 
                WHERE user_id = %s ORDER BY created_at DESC LIMIT 1
            ''', (user_id,))
            result = cursor.fetchone()
            conn.close()
            
            if result:
                status = result['verification_status']
                if status == 'verified':
                    return "Your KYC verification is complete and approved. You have full access to all banking services."
                elif status == 'pending':
                    return "Your KYC verification is currently under review. We'll notify you once it's processed."
                elif status == 'rejected':
                    return "Your KYC verification was rejected. Please resubmit your documents with correct information."
                else:
                    return "Your KYC verification status is unclear. Please contact support for assistance."
            else:
                return "You haven't submitted KYC documents yet. Please complete your KYC verification to access all banking services."
        except Exception as e:
            return "I couldn't check your KYC status right now."
    
    def classify_intent(self, message):
        message_lower = message.lower()
        
        # Greeting patterns
        if any(word in message_lower for word in ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening']):
            return 'greeting'
        
        # Balance check patterns
        if any(phrase in message_lower for phrase in ['balance', 'check balance', 'account balance', 'how much money']):
            return 'balance'
        
        # Transaction patterns
        if any(phrase in message_lower for phrase in ['transaction', 'recent transaction', 'transaction history', 'last transaction']):
            return 'transactions'
        
        # Transfer patterns
        if any(phrase in message_lower for phrase in ['transfer', 'send money', 'transfer money', 'money transfer']):
            return 'transfer'
        
        # Bill payment patterns
        if any(phrase in message_lower for phrase in ['pay bill', 'bill payment', 'bills', 'electricity bill', 'phone bill']):
            return 'bills'
        
        # Loan patterns
        if any(phrase in message_lower for phrase in ['loan', 'apply for loan', 'personal loan', 'home loan', 'car loan']):
            return 'loan'
        
        # Card patterns
        if any(phrase in message_lower for phrase in ['card', 'debit card', 'credit card', 'block card', 'card block']):
            return 'card'
        
        # ATM patterns
        if any(phrase in message_lower for phrase in ['atm', 'find atm', 'nearest atm', 'atm location']):
            return 'atm'
        
        # KYC patterns
        if any(phrase in message_lower for phrase in ['kyc', 'verification', 'kyc status', 'document verification']):
            return 'kyc'
        
        # Account patterns
        if any(phrase in message_lower for phrase in ['account', 'account details', 'account number', 'ifsc']):
            return 'account'
        
        return 'default'
    
    def _build_knowledge_vectors(self):
        questions = [item['question'] for item in self.knowledge_base]
        self.question_vectors = self.vectorizer.fit_transform(questions)
    
    def retrieve_knowledge(self, query, threshold=0.3):
        query_vector = self.vectorizer.transform([query])
        similarities = cosine_similarity(query_vector, self.question_vectors)[0]
        best_match_idx = np.argmax(similarities)
        
        if similarities[best_match_idx] > threshold:
            return self.knowledge_base[best_match_idx]['answer']
        return None
    
    def process_message(self, message, user_id=None):
        intent = self.classify_intent(message)
        
        if intent == 'greeting':
            return self.responses['greeting'][0]
        
        elif intent == 'balance' and user_id:
            return self.get_user_balance(user_id)
        
        elif intent == 'transactions' and user_id:
            return self.get_recent_transactions(user_id)
        
        elif intent == 'kyc' and user_id:
            return self.get_kyc_status(user_id)
        
        elif intent == 'transfer':
            return "To transfer money, please go to the Money Transfer section in your dashboard. I can guide you through the process if needed."
        
        elif intent == 'bills':
            return "For bill payments, please visit the Bill Payment section in your dashboard. You can pay electricity, phone, and other utility bills there."
        
        elif intent == 'loan':
            return "To apply for a loan, please visit the Loan Application section in your dashboard. We offer personal loans, home loans, and business loans."
        
        elif intent == 'card':
            return "For card-related services like blocking/unblocking cards or requesting new cards, please visit the Account Management section."
        
        elif intent == 'atm':
            return "To find the nearest ATM, please use our ATM locator feature in the mobile app or visit our website's branch locator."
        
        elif intent == 'account':
            return "You can view your complete account details including account number, IFSC code, and branch information in the Account Management section."
        
        else:
            # Use RAG for unknown queries
            rag_response = self.retrieve_knowledge(message)
            if rag_response:
                return rag_response
            return self.responses['default']