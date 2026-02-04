from typing import Annotated, TypedDict, Dict, Any
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode, tools_condition
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_google_genai import ChatGoogleGenerativeAI
import mysql.connector
import json
import random
from datetime import datetime
from dotenv import load_dotenv
import os

load_dotenv()

# State definition
class KYCState(TypedDict):
    messages: Annotated[list, add_messages]
    kyc_id: int
    validation_results: dict
    face_similarity: float
    kyc_context: dict
    decision: dict

class KYCAgentLangGraph:
    def __init__(self):
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
            self.get_kyc_context,
            self.approve_kyc,
            self.reject_kyc,
            self.mark_for_manual_review,
            self.create_bank_account
        ]
        
        # Bind tools to LLM
        self.llm_with_tools = self.llm.bind_tools(self.tools)
        
        # Build graph
        self.graph = self._build_graph()
    
    def _get_db_connection(self):
        return mysql.connector.connect(**self.db_config)
    
    def get_kyc_context(self, kyc_id: int) -> str:
        """Get comprehensive KYC context for analysis"""
        try:
            conn = self._get_db_connection()
            cursor = conn.cursor(dictionary=True)
            
            # Get KYC record
            cursor.execute('SELECT * FROM kyc_verification WHERE id = %s', (kyc_id,))
            kyc_record = cursor.fetchone()
            
            if not kyc_record:
                return json.dumps({'kyc_record': None})
            
            # Get user profile
            cursor.execute('SELECT * FROM users WHERE id = %s', (kyc_record['user_id'],))
            user = cursor.fetchone()
            
            cursor.execute('SELECT * FROM profiles WHERE user_id = %s', (kyc_record['user_id'],))
            profile = cursor.fetchone()
            
            # Get documents
            cursor.execute('SELECT * FROM documents WHERE user_id = %s', (kyc_record['user_id'],))
            documents = cursor.fetchall()
            
            # Get historical attempts
            cursor.execute('''
                SELECT * FROM kyc_verification 
                WHERE user_id = %s AND id != %s 
                ORDER BY created_at DESC LIMIT 5
            ''', (kyc_record['user_id'], kyc_id))
            previous_attempts = cursor.fetchall()
            
            context = {
                'kyc_record': kyc_record,
                'user': user,
                'profile': profile,
                'documents': documents,
                'previous_attempts': previous_attempts
            }
            
            conn.close()
            return json.dumps(context, default=str)
            
        except Exception as e:
            return json.dumps({'error': str(e)})
    
    def approve_kyc(self, kyc_id: int, reasoning: str, confidence_score: float) -> str:
        """Approve KYC application"""
        try:
            conn = self._get_db_connection()
            cursor = conn.cursor(dictionary=True)
            
            # Get user_id
            cursor.execute('SELECT user_id FROM kyc_verification WHERE id = %s', (kyc_id,))
            result = cursor.fetchone()
            user_id = result['user_id']
            
            # Update KYC status
            cursor.execute('''
                UPDATE kyc_verification 
                SET verification_status = %s, ai_feedback = %s, verified_at = NOW(), confidence_score = %s
                WHERE id = %s
            ''', ('verified', reasoning, confidence_score, kyc_id))
            
            # Update user role
            cursor.execute('UPDATE users SET role = %s WHERE id = %s', ('verified_customer', user_id))
            
            conn.commit()
            conn.close()
            
            return json.dumps({
                'status': 'approved',
                'kyc_id': kyc_id,
                'user_id': user_id,
                'reasoning': reasoning,
                'confidence_score': confidence_score
            })
            
        except Exception as e:
            return json.dumps({'error': str(e)})
    
    def reject_kyc(self, kyc_id: int, reasoning: str, confidence_score: float) -> str:
        """Reject KYC application"""
        try:
            conn = self._get_db_connection()
            cursor = conn.cursor()
            
            cursor.execute('''
                UPDATE kyc_verification 
                SET verification_status = %s, ai_feedback = %s, confidence_score = %s
                WHERE id = %s
            ''', ('rejected', reasoning, confidence_score, kyc_id))
            
            conn.commit()
            conn.close()
            
            return json.dumps({
                'status': 'rejected',
                'kyc_id': kyc_id,
                'reasoning': reasoning,
                'confidence_score': confidence_score
            })
            
        except Exception as e:
            return json.dumps({'error': str(e)})
    
    def mark_for_manual_review(self, kyc_id: int, reasoning: str, confidence_score: float) -> str:
        """Mark KYC for manual review"""
        try:
            conn = self._get_db_connection()
            cursor = conn.cursor()
            
            cursor.execute('''
                UPDATE kyc_verification 
                SET verification_status = %s, ai_feedback = %s, confidence_score = %s
                WHERE id = %s
            ''', ('manual_review', f"AI Analysis: {reasoning}", confidence_score, kyc_id))
            
            conn.commit()
            conn.close()
            
            return json.dumps({
                'status': 'manual_review',
                'kyc_id': kyc_id,
                'reasoning': reasoning,
                'confidence_score': confidence_score
            })
            
        except Exception as e:
            return json.dumps({'error': str(e)})
    
    def create_bank_account(self, user_id: int, account_type: str = "Savings") -> str:
        """Create bank account for approved user"""
        try:
            conn = self._get_db_connection()
            cursor = conn.cursor()
            
            # Check if account exists
            cursor.execute('SELECT id FROM accounts WHERE user_id = %s', (user_id,))
            if cursor.fetchone():
                conn.close()
                return json.dumps({'status': 'account_exists', 'user_id': user_id})
            
            # Generate account number
            account_number = f"50100{random.randint(100000, 999999)}"
            
            cursor.execute('''
                INSERT INTO accounts (user_id, account_number, account_type, balance, ifsc_code, branch_name, created_at)
                VALUES (%s, %s, %s, %s, %s, %s, NOW())
            ''', (user_id, account_number, account_type, 0.00, 'BSAI0001234', 'BankSecure Main Branch'))
            
            conn.commit()
            conn.close()
            
            return json.dumps({
                'status': 'account_created',
                'user_id': user_id,
                'account_number': account_number,
                'account_type': account_type
            })
            
        except Exception as e:
            return json.dumps({'error': str(e)})
    
    def analyzer_node(self, state: KYCState):
        """AI analyzes KYC data and makes decision"""
        system_prompt = """You are an expert KYC compliance officer with AI capabilities.

Your task is to:
1. Analyze KYC applications comprehensively
2. Make intelligent approval/rejection decisions
3. Ensure regulatory compliance
4. Call appropriate tools to process the decision

Available actions:
- get_kyc_context: Get comprehensive KYC data
- approve_kyc: Approve KYC with reasoning and confidence score
- reject_kyc: Reject KYC with detailed reasoning
- mark_for_manual_review: Flag for human review
- create_bank_account: Create account for approved users

Consider:
- Document authenticity and validation results
- Data consistency across sources
- Risk assessment and fraud indicators
- Regulatory compliance requirements
- Face verification results
- Historical patterns

Always start by getting KYC context, then analyze thoroughly and make a decision."""

        messages = [SystemMessage(content=system_prompt)] + state["messages"]
        response = self.llm_with_tools.invoke(messages)
        
        return {"messages": [response]}
    
    def should_continue(self, state: KYCState):
        """Determine if we should continue to tools or end"""
        messages = state["messages"]
        last_message = messages[-1]
        
        if hasattr(last_message, 'tool_calls') and last_message.tool_calls:
            return "tools"
        else:
            return END
    
    def _build_graph(self):
        """Build the LangGraph workflow"""
        builder = StateGraph(KYCState)
        
        # Add nodes
        builder.add_node("analyzer", self.analyzer_node)
        builder.add_node("tools", ToolNode(self.tools))
        
        # Add edges
        builder.add_edge(START, "analyzer")
        builder.add_conditional_edges("analyzer", self.should_continue)
        builder.add_edge("tools", "analyzer")
        
        return builder.compile()
    
    def process_kyc(self, kyc_id: int, validation_results: Dict[str, Any] = None, face_similarity: float = 0.0):
        """Process KYC using LangGraph workflow"""
        
        validation_summary = ""
        if validation_results:
            aadhaar_match = validation_results.get('aadhaar_validation', {}).get('match', False)
            pan_match = validation_results.get('pan_validation', {}).get('match', False)
            validation_summary = f"Aadhaar Match: {aadhaar_match}, PAN Match: {pan_match}, Face Similarity: {face_similarity:.2f}"
        
        initial_message = f"""
Please analyze and process KYC application ID: {kyc_id}

Validation Results: {validation_summary}

Steps:
1. Get comprehensive KYC context and user data
2. Analyze document validation results
3. Assess risk and compliance factors
4. Make approval/rejection decision with reasoning
5. Create bank account if approved

Provide detailed analysis and make a decision based on banking regulations and risk assessment.
"""
        
        # Run the graph
        result = self.graph.invoke({
            "messages": [HumanMessage(content=initial_message)],
            "kyc_id": kyc_id,
            "validation_results": validation_results or {},
            "face_similarity": face_similarity,
            "kyc_context": {},
            "decision": {}
        })
        
        return result

# Usage example
if __name__ == "__main__":
    agent = KYCAgentLangGraph()
    
    # Example validation results
    validation_results = {
        'aadhaar_validation': {'match': True, 'confidence_score': 0.95},
        'pan_validation': {'match': True, 'confidence_score': 0.92}
    }
    
    # Process KYC
    result = agent.process_kyc(
        kyc_id=1, 
        validation_results=validation_results, 
        face_similarity=0.85
    )
    
    # Print the conversation
    for message in result["messages"]:
        if hasattr(message, 'content'):
            print(f"Agent: {message.content}")
        elif hasattr(message, 'tool_calls'):
            print(f"Tool calls: {message.tool_calls}")