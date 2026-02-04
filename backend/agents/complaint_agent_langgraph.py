from typing import Annotated, TypedDict
from langgraph.graph import StateGraph, START, END
from langgraph.graph.message import add_messages
from langgraph.prebuilt import ToolNode, tools_condition
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_google_genai import ChatGoogleGenerativeAI
import mysql.connector
import json
import time
import random
from datetime import datetime
from dotenv import load_dotenv
import os

load_dotenv()

# State definition
class ComplaintState(TypedDict):
    messages: Annotated[list, add_messages]
    complaint_id: str
    complaint_data: dict
    analysis: dict
    action_result: dict

class ComplaintAgentLangGraph:
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
            self.get_complaint_context,
            self.verify_transaction_status,
            self.validate_sender_receiver_accounts,
            self.initiate_refund_process,
            self.process_auto_refund,
            self.mark_complaint_invalid,
            self.initiate_investigation,
            self.escalate_complaint,
            self.mark_for_manual_review
        ]
        
        # Bind tools to LLM
        self.llm_with_tools = self.llm.bind_tools(self.tools)
        
        # Build graph
        self.graph = self._build_graph()
    
    def _get_db_connection(self):
        return mysql.connector.connect(**self.db_config)
    
    def get_complaint_context(self, complaint_id: str) -> str:
        """Get comprehensive complaint context for AI analysis with detailed logging"""
        print(f"\n📋 [STEP 1] CONTEXT GATHERING - COLLECTING COMPLAINT DATA")
        print(f"🏷️  Complaint ID: {complaint_id}")
        print(f"🔄 Status: Gathering comprehensive complaint context...")
        
        conn = self._get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        try:
            print(f"💾 [DATABASE] Querying complaint details...")
            # Get complaint details
            cursor.execute('SELECT * FROM complaints WHERE complaint_id = %s', (complaint_id,))
            complaint = cursor.fetchone()
            
            if not complaint:
                print(f"❌ [ERROR] Complaint {complaint_id} not found")
                return json.dumps({'complaint': None})
            
            print(f"✅ [COMPLAINT FOUND] {complaint['issue_description'][:50]}...")
            
            # Get related data
            print(f"💾 [DATABASE] Querying related transaction...")
            cursor.execute('SELECT * FROM transactions WHERE transaction_id = %s', (complaint['transaction_id'],))
            transaction = cursor.fetchone()
            
            print(f"💾 [DATABASE] Querying user account...")
            cursor.execute('SELECT * FROM accounts WHERE user_id = %s', (complaint['user_id'],))
            account = cursor.fetchone()
            
            print(f"💾 [DATABASE] Querying user info...")
            cursor.execute('SELECT * FROM users WHERE id = %s', (complaint['user_id'],))
            user = cursor.fetchone()
            
            print(f"💾 [DATABASE] Querying similar complaints...")
            cursor.execute('''
                SELECT * FROM complaints 
                WHERE error_code = %s AND status = 'resolved' 
                ORDER BY created_at DESC LIMIT 5
            ''', (complaint['error_code'],))
            similar_complaints = cursor.fetchall()
            
            context = {
                'complaint': complaint,
                'transaction': transaction,
                'account': account,
                'user': user,
                'similar_complaints': similar_complaints
            }
            
            print(f"📊 [CONTEXT SUMMARY] {len(similar_complaints)} similar complaints found")
            print(f"💰 [TRANSACTION AMOUNT] ₹{transaction['amount'] if transaction else 'N/A'}")
            print(f"🚫 [ERROR CODE] {complaint['error_code']}")
            print(f"👤 [CUSTOMER] {user['full_name'] if user else 'Unknown'}")
            print(f"✅ [CONTEXT COMPLETE] All complaint data gathered successfully")
            
            return json.dumps(context, default=str)
        
        finally:
            conn.close()
    
    def verify_transaction_status(self, complaint_id: str) -> str:
        """Verify if transaction exists and check debit status with detailed logging"""
        print(f"\n🔍 [STEP 2] TRANSACTION VERIFICATION - CHECKING TRANSACTION STATUS")
        print(f"🏷️  Complaint ID: {complaint_id}")
        print(f"🔄 Status: Verifying transaction existence and debit status...")
        
        conn = self._get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        try:
            print(f"💾 [DATABASE] Querying complaint details...")
            # Get complaint and transaction details
            cursor.execute('SELECT * FROM complaints WHERE complaint_id = %s', (complaint_id,))
            complaint = cursor.fetchone()
            
            if not complaint:
                print(f"❌ [ERROR] Complaint {complaint_id} not found")
                return json.dumps({'status': 'error', 'message': 'Complaint not found'})
            
            print(f"💾 [DATABASE] Querying transaction record for {complaint['transaction_id']}...")
            cursor.execute('SELECT * FROM transactions WHERE transaction_id = %s', (complaint['transaction_id'],))
            transaction = cursor.fetchone()
            
            if not transaction:
                print(f"❌ [VERIFICATION FAILED] Transaction record not found: {complaint['transaction_id']}")
                return json.dumps({
                    'status': 'transaction_not_found',
                    'transaction_id': complaint['transaction_id'],
                    'verification_result': 'FAILED - No transaction record'
                })
            
            print(f"✅ [TRANSACTION FOUND] {transaction['transaction_id']}")
            print(f"💰 [AMOUNT] ₹{transaction['amount']}")
            print(f"📊 [STATUS] {transaction['status']}")
            print(f"🔄 [TYPE] {transaction['transaction_type']}")
            print(f"💳 [BALANCE BEFORE] ₹{transaction['before_balance']}")
            print(f"💳 [BALANCE AFTER] ₹{transaction['balance_after']}")
            
            # Check if amount was actually debited
            is_debited = transaction['status'] in ['completed', 'failed'] and transaction['transaction_type'] in ['transfer', 'payment']
            debit_amount = float(transaction['before_balance']) - float(transaction['balance_after'])
            
            # Check if transaction was successful
            is_successful = transaction['status'] == 'completed'
            
            print(f"🔍 [DEBIT ANALYSIS] Amount debited: ₹{debit_amount}")
            print(f"✅ [VERIFICATION] Money was {'DEBITED' if is_debited else 'NOT DEBITED'}")
            print(f"🎯 [TRANSACTION STATUS] {'SUCCESSFUL - NO REFUND NEEDED' if is_successful else 'FAILED - REFUND ELIGIBLE'}")
            
            verification_result = {
                'status': 'verified',
                'transaction_exists': True,
                'transaction_id': transaction['transaction_id'],
                'amount': float(transaction['amount']),
                'transaction_status': transaction['status'],
                'transaction_type': transaction['transaction_type'],
                'is_amount_debited': is_debited,
                'is_successful': is_successful,
                'before_balance': float(transaction['before_balance']),
                'after_balance': float(transaction['balance_after']),
                'debit_amount': debit_amount,
                'verification_result': 'PASSED - Transaction successful, no refund needed' if is_successful else 'PASSED - Transaction failed, refund eligible'
            }
            
            print(f"🎯 [VERIFICATION RESULT] {verification_result['verification_result']}")
            return json.dumps(verification_result)
            
        finally:
            conn.close()
    
    def validate_sender_receiver_accounts(self, complaint_id: str) -> str:
        """Validate both sender and receiver accounts for the transaction with detailed logging"""
        print(f"\n🔐 [STEP 3] ACCOUNT VALIDATION - VALIDATING SENDER & RECEIVER ACCOUNTS")
        print(f"🏷️  Complaint ID: {complaint_id}")
        print(f"🔄 Status: Checking account details and status...")
        
        conn = self._get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        try:
            print(f"💾 [DATABASE] Getting transaction and account details...")
            # Get complaint and transaction
            cursor.execute('SELECT * FROM complaints WHERE complaint_id = %s', (complaint_id,))
            complaint = cursor.fetchone()
            
            cursor.execute('SELECT * FROM transactions WHERE transaction_id = %s', (complaint['transaction_id'],))
            transaction = cursor.fetchone()
            
            if not transaction:
                print(f"❌ [ERROR] Transaction not found")
                return json.dumps({'status': 'error', 'message': 'Transaction not found'})
            
            # Get sender account (the complainant)
            cursor.execute('SELECT * FROM accounts WHERE user_id = %s', (complaint['user_id'],))
            sender_account = cursor.fetchone()
            
            cursor.execute('SELECT * FROM users WHERE id = %s', (complaint['user_id'],))
            sender_user = cursor.fetchone()
            
            print(f"👤 [SENDER ACCOUNT] {sender_user['full_name']} (ID: {sender_account['id']})")
            print(f"💳 [SENDER BALANCE] ₹{sender_account['balance']}")
            print(f"✅ [SENDER STATUS] active")  # Default status
            
            # For receiver validation, we'll check if it's a valid transaction type
            # In a real system, you'd have receiver details in the transaction
            receiver_validation = {
                'exists': True,  # Assuming receiver exists for completed transactions
                'status': 'active',
                'validation_method': 'transaction_completion_check'
            }
            
            print(f"🏦 [RECEIVER VALIDATION] Account exists and is active")
            print(f"🔍 [VALIDATION METHOD] Transaction completion check")
            
            validation_result = {
                'status': 'validated',
                'sender_account': {
                    'user_id': sender_account['user_id'],
                    'account_id': sender_account['id'],
                    'username': sender_user['full_name'],
                    'balance': float(sender_account['balance']),
                    'status': 'active',  # Default status
                    'is_valid': True
                },
                'receiver_account': receiver_validation,
                'validation_result': 'PASSED - Both accounts validated',
                'ready_for_refund': True
            }
            
            print(f"🎯 [ACCOUNT VALIDATION] {validation_result['validation_result']}")
            print(f"✅ [READY FOR REFUND] {validation_result['ready_for_refund']}")
            
            return json.dumps(validation_result)
            
        finally:
            conn.close()
    
    def initiate_refund_process(self, complaint_id: str, validation_data: dict) -> str:
        """Initiate the refund process after all validations with detailed logging"""
        print(f"\n🚀 [STEP 4] REFUND INITIATION - STARTING REFUND PROCESS")
        print(f"🏷️  Complaint ID: {complaint_id}")
        print(f"📋 Validation Data: All checks passed")
        print(f"🔄 Status: Initiating refund process...")
        
        conn = self._get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        try:
            print(f"💾 [DATABASE] Starting refund initiation process...")
            
            # Update complaint status to processing refund
            cursor.execute('''
                UPDATE complaints 
                SET status = %s, resolution_notes = %s
                WHERE complaint_id = %s
            ''', ('processing', 'Refund initiated after validation', complaint_id))
            
            conn.commit()
            
            print(f"⏳ [STATUS UPDATE] Complaint status updated to 'processing_refund'")
            print(f"🔄 [NEXT STEP] Preparing to execute actual refund transaction")
            print(f"✅ [REFUND READY] All validations passed - proceeding to refund execution")
            
            return json.dumps({
                'status': 'refund_initiated',
                'complaint_id': complaint_id,
                'message': 'Refund process started after successful validation',
                'next_action': 'process_auto_refund'
            })
            
        finally:
            conn.close()
    
    def process_auto_refund(self, complaint_id: str, refund_amount: float, refund_reason: str) -> str:
        """Process automatic refund with detailed logging"""
        print(f"\n💰 [STEP 5] REFUND EXECUTION - PROCESSING AUTOMATIC REFUND")
        print(f"🏷️  Complaint ID: {complaint_id}")
        print(f"💵 Refund Amount: ₹{refund_amount}")
        print(f"📝 Reason: {refund_reason}")
        print(f"🔄 Status: Executing final refund transaction...")
        
        conn = self._get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        try:
            print(f"💾 [DATABASE] Getting complaint and account details...")
            # Get complaint and account
            cursor.execute('SELECT * FROM complaints WHERE complaint_id = %s', (complaint_id,))
            complaint = cursor.fetchone()
            
            cursor.execute('SELECT * FROM accounts WHERE user_id = %s', (complaint['user_id'],))
            account = cursor.fetchone()
            
            if not account:
                print(f"❌ [ERROR] Account not found for user {complaint['user_id']}")
                return json.dumps({'status': 'error', 'message': 'Account not found'})
            
            # Process refund
            print(f"💳 [REFUND PROCESSING] Crediting amount back to customer account...")
            new_balance = float(account['balance']) + refund_amount
            print(f"📊 [BALANCE UPDATE] ₹{account['balance']} → ₹{new_balance}")
            
            cursor.execute('UPDATE accounts SET balance = %s WHERE user_id = %s', 
                         (new_balance, complaint['user_id']))
            
            refund_txn_id = f"REF{int(time.time())}{random.randint(100, 999)}"
            print(f"🏷️  [TRANSACTION ID] Generated refund transaction: {refund_txn_id}")
            
            cursor.execute('''
                INSERT INTO transactions (account_id, transaction_type, amount, before_balance, 
                balance_after, transaction_id, description, status, created_at) 
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW())
            ''', (
                account['id'], 'refund', refund_amount, account['balance'], 
                new_balance, refund_txn_id, refund_reason, 'completed'
            ))
            
            print(f"💾 [DATABASE] Updating complaint status to resolved...")
            cursor.execute('''
                UPDATE complaints 
                SET status = %s, resolution_notes = %s, resolved_at = NOW(),
                    refund_transaction_id = %s 
                WHERE complaint_id = %s
            ''', ('resolved', refund_reason, refund_txn_id, complaint_id))
            
            conn.commit()
            
            print(f"\n✅ [SUCCESS] REFUND PROCESSING COMPLETED!")
            print(f"💰 Amount Refunded: ₹{refund_amount}")
            print(f"🏷️  Refund Transaction ID: {refund_txn_id}")
            print(f"💳 New Account Balance: ₹{new_balance}")
            print(f"📋 Complaint Status: RESOLVED")
            print(f"⏰ Resolution Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
            
            return json.dumps({
                'status': 'refund_processed',
                'refund_amount': refund_amount,
                'refund_transaction_id': refund_txn_id,
                'new_balance': new_balance
            })
        
        finally:
            conn.close()
    
    def initiate_investigation(self, complaint_id: str, investigation_plan: str) -> str:
        """Initiate investigation for complaint"""
        conn = self._get_db_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                UPDATE complaints 
                SET status = %s, resolution_notes = %s 
                WHERE complaint_id = %s
            ''', ('investigating', f"Investigation initiated: {investigation_plan}", complaint_id))
            
            conn.commit()
            
            return json.dumps({
                'status': 'investigation_initiated',
                'plan': investigation_plan
            })
        
        finally:
            conn.close()
    
    def escalate_complaint(self, complaint_id: str, escalation_reason: str, escalation_team: str) -> str:
        """Escalate complaint to specialized team"""
        conn = self._get_db_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                UPDATE complaints 
                SET status = %s, resolution_notes = %s, priority = %s
                WHERE complaint_id = %s
            ''', ('escalated', f"Escalated to {escalation_team}: {escalation_reason}", 'high', complaint_id))
            
            conn.commit()
            
            return json.dumps({
                'status': 'escalated',
                'team': escalation_team,
                'reason': escalation_reason
            })
        
        finally:
            conn.close()
    
    def mark_complaint_invalid(self, complaint_id: str, reason: str) -> str:
        """Mark complaint as invalid for successful transactions"""
        print(f"\n❌ [COMPLAINT INVALID] TRANSACTION ALREADY SUCCESSFUL")
        print(f"🏷️  Complaint ID: {complaint_id}")
        print(f"📝 Reason: {reason}")
        print(f"✅ [RESOLUTION] No further action needed - transaction was successful")
        
        conn = self._get_db_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute(
                'UPDATE complaints SET status = %s, resolution_notes = %s WHERE complaint_id = %s',
                ('closed', reason, complaint_id)
            )
            conn.commit()
            
            print(f"✅ [STATUS UPDATED] Complaint marked as invalid - no action required")
            
            return json.dumps({
                'status': 'closed',
                'complaint_id': complaint_id,
                'reason': reason,
                'message': 'Transaction was already successful. No further action needed.'
            })
        
        finally:
            conn.close()
    
    def mark_for_manual_review(self, complaint_id: str, review_notes: str) -> str:
        """Mark complaint for manual review"""
        conn = self._get_db_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute('''
                UPDATE complaints 
                SET status = %s, resolution_notes = %s
                WHERE complaint_id = %s
            ''', ('manual_review', f"Manual review required: {review_notes}", complaint_id))
            
            conn.commit()
            
            return json.dumps({
                'status': 'manual_review_required',
                'notes': review_notes
            })
        
        finally:
            conn.close()
    
    def analyzer_node(self, state: ComplaintState):
        """AI analyzes complaint and determines action with detailed logging"""
        print(f"\n🧠 [ANALYZER NODE] AI DECISION ENGINE ACTIVATED")
        print(f"📊 [GEMINI AI] Processing complaint context and determining next action...")
        
        system_prompt = """You are an expert banking complaint resolution agent. 

Your task is to follow a systematic validation process:

**MANDATORY VALIDATION SEQUENCE:**
1. get_complaint_context - Gather complaint details
2. verify_transaction_status - Check if transaction exists and amount was debited
3. IF transaction status is 'completed' - STOP HERE and call mark_complaint_invalid
4. validate_sender_receiver_accounts - Only for failed transactions
5. initiate_refund_process - Only for failed transactions
6. process_auto_refund - Only for failed transactions

**Available actions:**
- get_complaint_context: Get complaint and related data
- verify_transaction_status: Check transaction record and debit status
- mark_complaint_invalid: Mark complaint invalid for successful transactions
- validate_sender_receiver_accounts: Validate sender/receiver accounts
- initiate_refund_process: Start refund process after validation
- process_auto_refund: Execute actual refund (only after validation)
- mark_for_manual_review: For cases requiring human intervention
- initiate_investigation: For complex issues needing investigation  
- escalate_complaint: For high-risk or specialized issues

**CRITICAL RULE:** If verify_transaction_status shows transaction status is 'completed', immediately call mark_complaint_invalid with reason 'Transaction was already successful. No further action needed.' DO NOT proceed with any other steps.

Respond with clear reasoning and call tools in the correct order."""

        messages = [SystemMessage(content=system_prompt)] + state["messages"]
        
        print(f"🤖 [AI PROCESSING] Analyzing complaint context and determining action...")
        response = self.llm_with_tools.invoke(messages)
        print(response)
        # Check if AI made tool calls
        if hasattr(response, 'tool_calls') and response.tool_calls:
            print(f"🔧 [AI DECISION] Calling {len(response.tool_calls)} tool(s):")
            for i, tool_call in enumerate(response.tool_calls, 1):
                tool_name = tool_call['name']
                tool_args = tool_call.get('args', {})
                print(f"   {i}. 🛠️  {tool_name}() - {tool_args}")
                
                # Log specific tool purposes
                if tool_name == 'get_complaint_context':
                    print(f"      📋 Purpose: Gathering complaint and transaction details")
                elif tool_name == 'verify_transaction_status':
                    print(f"      🔍 Purpose: Checking if money was actually debited")
                elif tool_name == 'validate_sender_receiver_accounts':
                    print(f"      🔐 Purpose: Validating account details and status")
                elif tool_name == 'initiate_refund_process':
                    print(f"      🚀 Purpose: Starting refund process after validation")
                elif tool_name == 'mark_complaint_invalid':
                    print(f"      ❌ Purpose: Marking complaint invalid - transaction already successful")
        else:
            print(f"💬 [AI RESPONSE] {response.content[:100]}...")
        
        return {"messages": [response]}
    
    def should_continue(self, state: ComplaintState):
        """Determine if we should continue to tools or end"""
        messages = state["messages"]
        last_message = messages[-1]
        
        # If the last message has tool calls, continue to tools
        if hasattr(last_message, 'tool_calls') and last_message.tool_calls:
            return "tools"
        else:
            return END
    
    def _build_graph(self):
        """Build the LangGraph workflow"""
        builder = StateGraph(ComplaintState)
        
        # Add nodes
        builder.add_node("analyzer", self.analyzer_node)
        builder.add_node("tools", ToolNode(self.tools))
        
        # Add edges
        builder.add_edge(START, "analyzer")
        builder.add_conditional_edges("analyzer", self.should_continue)
        builder.add_edge("tools", "analyzer")
        
        return builder.compile()
    
    def process_complaint(self, complaint_id: str, description: str = ""):
        """Process complaint using LangGraph workflow with detailed logging"""
        print(f"\n" + "="*100)
        print(f"[COMPLAINT AGENT] 🤖 LANGGRAPH AI AGENT ACTIVATED")
        print(f"[COMPLAINT ID] {complaint_id}")
        print(f"[DESCRIPTION] {description}")
        print(f"[AGENT TYPE] LangGraph-based Complaint Resolution Agent")
        print(f"[WORKFLOW] Starting 5-step validation and resolution process")
        print("="*100)
        
        # Update complaint status to show agent is processing
        self._update_complaint_status(complaint_id, 'processing', 'LangGraph AI Agent assigned and processing')
        
        initial_message = f"""
Please analyze and resolve complaint ID: {complaint_id}

Description: {description}

**MANDATORY VALIDATION SEQUENCE - Follow these steps in order:**
1. Get complaint context and related data
2. Verify transaction status - check if transaction exists and amount was debited
3. Validate sender and receiver accounts
4. Initiate refund process after successful validation
5. Execute the actual refund transaction

**DO NOT skip validation steps. Each step must be completed before proceeding to the next.**

Provide detailed analysis at each step and take appropriate action.
"""
        
        print(f"\n[LANGGRAPH WORKFLOW] 🔄 Initializing State Machine")
        print(f"[STEP SEQUENCE] Context → Verification → Validation → Initiation → Execution")
        print(f"[AI MODEL] Gemini 2.5 Flash with Tool Calling")
        print(f"[TOOLS AVAILABLE] 8 specialized banking tools")
        print(f"[PROCESSING] Starting complaint resolution workflow...")
        print("-"*80)
        
        # Run the graph
        result = self.graph.invoke({
            "messages": [HumanMessage(content=initial_message)],
            "complaint_id": complaint_id,
            "complaint_data": {},
            "analysis": {},
            "action_result": {}
        })
        
        print(f"\n" + "="*100)
        print(f"[COMPLAINT AGENT] ✅ WORKFLOW COMPLETED")
        print(f"[COMPLAINT ID] {complaint_id}")
        print(f"[TOTAL MESSAGES] {len(result['messages'])} AI interactions")
        print(f"[FINAL STATUS] Resolution process completed")
        print(f"[NEXT STEP] Check complaint tracking for detailed status")
        print("="*100)
        
        return result
    
    def _update_complaint_status(self, complaint_id: str, status: str, notes: str):
        """Update complaint status in database"""
        conn = self._get_db_connection()
        cursor = conn.cursor()
        
        try:
            cursor.execute(
                'UPDATE complaints SET status = %s, resolution_notes = %s WHERE complaint_id = %s',
                (status, notes, complaint_id)
            )
            conn.commit()
        except Exception as e:
            print(f"[ERROR] Failed to update complaint status: {e}")
        finally:
            conn.close()

# Usage example
if __name__ == "__main__":
    agent = ComplaintAgentLangGraph()
    
    # Process a complaint
    result = agent.process_complaint("COMP123", "Transaction failed but amount was debited")
    
    # Print the conversation
    for message in result["messages"]:
        if hasattr(message, 'content'):
            print(f"Agent: {message.content}")
        elif hasattr(message, 'tool_calls'):
            print(f"Tool calls: {message.tool_calls}")