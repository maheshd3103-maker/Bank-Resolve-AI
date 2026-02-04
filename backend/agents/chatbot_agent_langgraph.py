from typing import Annotated, TypedDict, Optional
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode, tools_condition
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_google_genai import ChatGoogleGenerativeAI
import mysql.connector
import json
from datetime import datetime
from dotenv import load_dotenv
import os

load_dotenv()

# State definition
class ChatbotState(TypedDict):
    messages: Annotated[list, add_messages]
    user_id: Optional[int]
    user_context: dict
    conversation_memory: list

class ChatbotAgentLangGraph:
    def __init__(self, rag_service=None):
        self.rag_service = rag_service
        self.db_config = {
            'host': 'localhost',
            'user': 'root',
            'password': 'root',
            'database': 'banksecure'
        }
        
        # Initialize LLM
        self.llm = ChatGoogleGenerativeAI(
            model="gemini-2.5-flash",
            google_api_key=os.getenv("GOOGLE_API_KEY"),
            temperature=0.3
        )
        
        # Define tools
        self.tools = [
            self.get_user_context,
            self.get_account_info,
            self.get_transaction_history,
            self.get_kyc_status,
            self.get_complaint_status,
            self.query_rag_system
        ]
        
        # Bind tools to LLM
        self.llm_with_tools = self.llm.bind_tools(self.tools)
        
        # Build graph
        self.graph = self._build_graph()
    
    def _get_db_connection(self):
        return mysql.connector.connect(**self.db_config)
    
    def get_user_context(self, user_id: int) -> str:
        """Get comprehensive user context"""
        try:
            conn = self._get_db_connection()
            cursor = conn.cursor(dictionary=True)
            
            # Get user info
            cursor.execute('SELECT full_name, email, role FROM users WHERE id = %s', (user_id,))
            user = cursor.fetchone()
            
            # Get account info
            cursor.execute('SELECT account_type, balance, account_number FROM accounts WHERE user_id = %s', (user_id,))
            account = cursor.fetchone()
            
            # Get KYC status
            cursor.execute('SELECT verification_status FROM kyc_verification WHERE user_id = %s ORDER BY created_at DESC LIMIT 1', (user_id,))
            kyc = cursor.fetchone()
            
            context = {
                'user': user,
                'account': account,
                'kyc_status': kyc.get('verification_status') if kyc else None,
                'is_authenticated': True
            }
            
            conn.close()
            return json.dumps(context, default=str)
            
        except Exception as e:
            return json.dumps({'error': str(e), 'is_authenticated': False})
    
    def get_account_info(self, user_id: int) -> str:
        """Get detailed account information"""
        try:
            conn = self._get_db_connection()
            cursor = conn.cursor(dictionary=True)
            
            cursor.execute('SELECT * FROM accounts WHERE user_id = %s', (user_id,))
            account = cursor.fetchone()
            
            conn.close()
            return json.dumps(account, default=str) if account else json.dumps({'error': 'Account not found'})
            
        except Exception as e:
            return json.dumps({'error': str(e)})
    
    def get_transaction_history(self, user_id: int, limit: int = 5) -> str:
        """Get recent transaction history"""
        try:
            conn = self._get_db_connection()
            cursor = conn.cursor(dictionary=True)
            
            cursor.execute('''
                SELECT t.* FROM transactions t 
                JOIN accounts a ON t.account_id = a.id 
                WHERE a.user_id = %s 
                ORDER BY t.created_at DESC LIMIT %s
            ''', (user_id, limit))
            
            transactions = cursor.fetchall()
            conn.close()
            
            return json.dumps(transactions, default=str)
            
        except Exception as e:
            return json.dumps({'error': str(e)})
    
    def get_kyc_status(self, user_id: int) -> str:
        """Get KYC verification status"""
        try:
            conn = self._get_db_connection()
            cursor = conn.cursor(dictionary=True)
            
            cursor.execute('SELECT * FROM kyc_verification WHERE user_id = %s ORDER BY created_at DESC LIMIT 1', (user_id,))
            kyc = cursor.fetchone()
            
            conn.close()
            return json.dumps(kyc, default=str) if kyc else json.dumps({'status': 'not_found'})
            
        except Exception as e:
            return json.dumps({'error': str(e)})
    
    def get_complaint_status(self, user_id: int) -> str:
        """Get complaint status and history"""
        try:
            conn = self._get_db_connection()
            cursor = conn.cursor(dictionary=True)
            
            cursor.execute('SELECT * FROM complaints WHERE user_id = %s ORDER BY created_at DESC LIMIT 5', (user_id,))
            complaints = cursor.fetchall()
            
            conn.close()
            return json.dumps(complaints, default=str)
            
        except Exception as e:
            return json.dumps({'error': str(e)})
    
    def query_rag_system(self, query: str) -> str:
        """Query RAG system for policy and procedure information"""
        if self.rag_service:
            try:
                result = self.rag_service.query(query)
                return json.dumps({
                    'has_context': result.get('has_context', False),
                    'answer': result.get('answer', 'No relevant information found'),
                    'source': 'RAG System'
                })
            except Exception as e:
                return json.dumps({'error': str(e), 'has_context': False})
        else:
            return json.dumps({'error': 'RAG system not available', 'has_context': False})
    
    def should_use_rag(self, message: str) -> bool:
        """Determine if message should use RAG system"""
        rag_keywords = [
            'policy', 'procedure', 'refund', 'reversal', 'categories', 'types',
            'delayed', 'partial', 'duplicate', 'failed', 'authentication',
            'security', 'compliance', 'regulatory', 'transaction management',
            'kyc policy', 'verification policy', 'issue categories'
        ]
        message_lower = message.lower()
        return any(keyword in message_lower for keyword in rag_keywords)
    
    def chatbot_node(self, state: ChatbotState):
        """Main chatbot processing node"""
        user_message = state["messages"][-1].content if state["messages"] else ""
        user_id = state.get("user_id")
        
        # Determine if we should use RAG
        use_rag = self.should_use_rag(user_message)
        
        system_prompt = f"""You are an intelligent banking assistant for BankSecure AI.

User ID: {user_id}
Use RAG for this query: {use_rag}

You can help with:
- Account information and balance inquiries
- Transaction history and details
- KYC verification status
- Complaint status and resolution
- Banking policies and procedures (use RAG system)
- General banking assistance

Available tools:
- get_user_context: Get user profile and basic info
- get_account_info: Get detailed account information
- get_transaction_history: Get recent transactions
- get_kyc_status: Get KYC verification status
- get_complaint_status: Get complaint history
- query_rag_system: Query policies and procedures

Instructions:
1. If user asks about policies/procedures, use query_rag_system first
2. For account-specific queries, get user context and relevant data
3. Provide personalized, helpful responses
4. Be professional and conversational
5. Call appropriate tools to get accurate information

Respond naturally and call tools as needed to provide accurate information."""

        messages = [SystemMessage(content=system_prompt)] + state["messages"]
        response = self.llm_with_tools.invoke(messages)
        
        return {"messages": [response]}
    
    def should_continue(self, state: ChatbotState):
        """Determine if we should continue to tools or end"""
        messages = state["messages"]
        last_message = messages[-1]
        
        if hasattr(last_message, 'tool_calls') and last_message.tool_calls:
            return "tools"
        else:
            return END
    
    def _build_graph(self):
        """Build the LangGraph workflow"""
        builder = StateGraph(ChatbotState)
        
        # Add nodes
        builder.add_node("chatbot", self.chatbot_node)
        builder.add_node("tools", ToolNode(self.tools))
        
        # Add edges
        builder.add_edge(START, "chatbot")
        builder.add_conditional_edges("chatbot", self.should_continue)
        builder.add_edge("tools", "chatbot")
        
        return builder.compile()
    
    def process_message(self, message: str, user_id: Optional[int] = None):
        """Process user message using LangGraph workflow"""
        
        # Run the graph
        result = self.graph.invoke({
            "messages": [HumanMessage(content=message)],
            "user_id": user_id,
            "user_context": {},
            "conversation_memory": []
        })
        
        return result
    
    def chat_loop(self, user_id: Optional[int] = None):
        """Interactive chat loop"""
        print("BankSecure AI Assistant - Type 'exit' to quit")
        conversation_history = []
        
        while True:
            try:
                user_input = input("\nYou: ").strip()
                if user_input.lower() in ['exit', 'quit', 'bye']:
                    print("Thank you for using BankSecure AI Assistant!")
                    break
                
                if not user_input:
                    continue
                
                # Add to conversation history
                conversation_history.append(HumanMessage(content=user_input))
                
                # Process message
                result = self.graph.invoke({
                    "messages": conversation_history,
                    "user_id": user_id,
                    "user_context": {},
                    "conversation_memory": []
                })
                
                # Get the last assistant message
                last_message = result["messages"][-1]
                if hasattr(last_message, 'content'):
                    print(f"\nAssistant: {last_message.content}")
                    conversation_history.append(last_message)
                
                # Keep conversation history manageable
                if len(conversation_history) > 10:
                    conversation_history = conversation_history[-10:]
                    
            except KeyboardInterrupt:
                print("\nGoodbye!")
                break
            except Exception as e:
                print(f"Error: {e}")

# Usage example
if __name__ == "__main__":
    # Initialize agent (without RAG for this example)
    agent = ChatbotAgentLangGraph()
    
    # Start interactive chat
    agent.chat_loop(user_id=1)  # Replace with actual user ID