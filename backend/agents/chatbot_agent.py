import mysql.connector
import random
import datetime

class BankingChatbotAgent:
    def __init__(self):
        # Banking responses
        self.banking_responses = {
            'greeting': "Hello! I'm your AI assistant. I can help with banking or answer any questions you have!",
            'balance': "Let me check your account balance for you.",
            'transactions': "I'll get your recent transaction history.",
            'kyc': "I can help you with KYC verification status.",
            'transfer': "To transfer money, go to the Money Transfer section in your dashboard.",
            'bills': "For bill payments, visit the Bill Payment section in your dashboard.",
            'loan': "To apply for a loan, visit the Loan Application section.",
            'account': "You can view your account details in Account Management."
        }
        
        # General conversation responses
        self.general_responses = {
            'how_are_you': [
                "I'm doing great! Thanks for asking. How can I help you today?",
                "I'm fantastic! Ready to assist you with anything you need.",
                "I'm doing well! What would you like to know?"
            ],
            'weather': [
                "I don't have access to current weather data, but you can check your local weather app!",
                "For weather updates, I'd recommend checking a weather website or app.",
                "I wish I could tell you about the weather, but I don't have that information right now."
            ],
            'time': f"The current time is {datetime.datetime.now().strftime('%I:%M %p')}",
            'date': f"Today's date is {datetime.datetime.now().strftime('%B %d, %Y')}",
            'thanks': [
                "You're welcome! Happy to help!",
                "No problem at all! Anything else I can help with?",
                "Glad I could help! Feel free to ask me anything else."
            ],
            'goodbye': [
                "Goodbye! Have a great day!",
                "See you later! Take care!",
                "Bye! Come back anytime if you need help!"
            ],
            'name': [
                "I'm your AI banking assistant! You can call me BankBot.",
                "I'm BankBot, your friendly AI assistant!",
                "My name is BankBot, and I'm here to help you!"
            ],
            'age': [
                "I'm a digital assistant, so I don't have an age in the traditional sense!",
                "I was created recently to help with banking services!",
                "I'm timeless - just here to help whenever you need me!"
            ],
            'joke': [
                "Why don't scientists trust atoms? Because they make up everything!",
                "Why did the scarecrow win an award? He was outstanding in his field!",
                "What do you call a fake noodle? An impasta!",
                "Why don't eggs tell jokes? They'd crack each other up!"
            ],
            'help': [
                "I can help with banking services like checking balance, transactions, transfers, and KYC status. I can also chat about general topics!",
                "Ask me about your account, transactions, or just have a casual conversation!",
                "I'm here for banking help or general questions. What would you like to know?"
            ]
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
                return "I couldn't find your account. Please complete your KYC verification first."
        except Exception as e:
            return "I'm having trouble accessing your account information right now."
    
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
                    return "Your KYC is complete! You have full access to all banking services."
                elif status == 'pending':
                    return "Your KYC is under review. We'll notify you once it's processed."
                elif status == 'rejected':
                    return "Your KYC was rejected. Please resubmit your documents."
                else:
                    return "Your KYC status is unclear. Please contact support."
            else:
                return "You haven't submitted KYC documents yet. Please complete your KYC verification."
        except Exception as e:
            return "I couldn't check your KYC status right now."
    
    def classify_intent(self, message):
        message_lower = message.lower()
        
        # Banking intents
        if any(word in message_lower for word in ['balance', 'money', 'account balance', 'check balance']):
            return 'balance'
        
        if any(word in message_lower for word in ['transaction', 'history', 'recent', 'last transaction']):
            return 'transactions'
        
        if any(word in message_lower for word in ['kyc', 'verification', 'documents', 'kyc status']):
            return 'kyc'
        
        if any(word in message_lower for word in ['transfer', 'send money', 'payment']):
            return 'transfer'
        
        if any(word in message_lower for word in ['bill', 'bills', 'pay bill']):
            return 'bills'
        
        if any(word in message_lower for word in ['loan', 'apply loan', 'personal loan']):
            return 'loan'
        
        if any(word in message_lower for word in ['account', 'account details', 'ifsc']):
            return 'account'
        
        # General conversation intents
        if any(word in message_lower for word in ['hello', 'hi', 'hey', 'good morning', 'good afternoon']):
            return 'greeting'
        
        if any(phrase in message_lower for phrase in ['how are you', 'how do you do', 'how are things']):
            return 'how_are_you'
        
        if any(word in message_lower for word in ['weather', 'temperature', 'rain', 'sunny']):
            return 'weather'
        
        if any(phrase in message_lower for phrase in ['what time', 'current time', 'time now']):
            return 'time'
        
        if any(phrase in message_lower for phrase in ['what date', 'today date', 'current date']):
            return 'date'
        
        if any(word in message_lower for word in ['thanks', 'thank you', 'appreciate']):
            return 'thanks'
        
        if any(word in message_lower for word in ['bye', 'goodbye', 'see you', 'farewell']):
            return 'goodbye'
        
        if any(phrase in message_lower for phrase in ['your name', 'who are you', 'what are you']):
            return 'name'
        
        if any(phrase in message_lower for phrase in ['your age', 'how old', 'age']):
            return 'age'
        
        if any(word in message_lower for word in ['joke', 'funny', 'humor', 'laugh']):
            return 'joke'
        
        if any(word in message_lower for word in ['help', 'assist', 'support', 'what can you do']):
            return 'help'
        
        return 'general'
    
    def generate_general_response(self, message):
        """Generate responses for non-banking questions"""
        responses = [
            "That's an interesting question! While I specialize in banking, I'm happy to chat about anything.",
            "I'm not sure about that, but I'm here to help with whatever you need!",
            "That's outside my expertise, but I'd love to help you with banking services!",
            "I don't have specific information about that, but feel free to ask me anything else!",
            "Interesting topic! Is there anything banking-related I can help you with?",
            "I'm still learning about many topics, but I'm great with banking questions!",
            "That's a good question! While I focus on banking, I enjoy our conversation!",
            "I may not know everything, but I'm always here to help however I can!"
        ]
        return random.choice(responses)
    
    def process_message(self, message, user_id=None):
        try:
            intent = self.classify_intent(message)
            
            # Handle banking intents
            if intent == 'balance' and user_id:
                return self.get_user_balance(user_id)
            
            elif intent == 'transactions' and user_id:
                return self.get_recent_transactions(user_id)
            
            elif intent == 'kyc' and user_id:
                return self.get_kyc_status(user_id)
            
            elif intent in self.banking_responses:
                return self.banking_responses[intent]
            
            # Handle general conversation intents
            elif intent in self.general_responses:
                response = self.general_responses[intent]
                if isinstance(response, list):
                    return random.choice(response)
                return response
            
            # Handle unknown/general questions
            else:
                return self.generate_general_response(message)
                
        except Exception as e:
            print(f"Chatbot error: {e}")
            return "I'm having a small technical issue, but I'm still here to help! What would you like to know?"