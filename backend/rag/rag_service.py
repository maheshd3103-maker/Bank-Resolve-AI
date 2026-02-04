import os
import google.generativeai as genai
from dotenv import load_dotenv
from retriever import Retriever
import hashlib
import json
import time

load_dotenv()

class RAGService:
    def __init__(self):
        genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
        self.model = genai.GenerativeModel('gemini-2.5-flash')
        self.retriever = Retriever()
        self.response_cache = {}  # Simple in-memory cache
        print("RAG Service initialized successfully")

    def is_banking_query(self, query):
        banking_keywords = [
            'kyc', 'account', 'transaction', 'transfer', 'refund', 'reversal',
            'authentication', 'security', 'compliance', 'bank', 'policy',
            'payment', 'deposit', 'withdrawal', 'balance', 'loan',
            'credit', 'procedure', 'process', 'requirements', 'issue',
            'delayed', 'partial', 'duplicate', 'failed', 'categories'
        ]
        query_lower = query.lower()
        return any(word in query_lower for word in banking_keywords)

    def query(self, user_question):
        print(f"RAG Query received: {user_question}")
        
        if not self.is_banking_query(user_question):
            return {
                'answer': "I can assist only with banking and policy-related questions.",
                'has_context': False,
                'sources': []
            }

        return self.generate_response(user_question)
    
    def generate_response(self, query):
        try:
            # Check cache first
            cache_key = hashlib.md5(query.lower().encode()).hexdigest()
            if cache_key in self.response_cache:
                cached_response = self.response_cache[cache_key]
                if time.time() - cached_response['timestamp'] < 3600:  # 1 hour cache
                    print("Using cached response")
                    return cached_response['response']
            
            print(f"Getting context for query: {query}")
            context = self.retriever.get_context(query)
            print(f"Retrieved context length: {len(context) if context else 0}")
            
            if not context:
                print("No context found, using general knowledge")
                return {
                    'answer': "I don't have specific information about that in our policy documents. Let me provide general banking guidance.",
                    'has_context': False,
                    'sources': []
                }
            
            prompt = f"""You are a banking assistant for BankSecure AI. Answer the question based ONLY on the policy documents provided below.

Policy Document Context:
{context}

Customer Question: {query}

Instructions:
1. Use ONLY the information from the policy documents above
2. If the documents contain relevant information, provide a detailed answer
3. Include specific policy details, procedures, and categories mentioned in the documents
4. Be professional and helpful
5. If the documents don't contain enough information, say so clearly

Answer:"""
            
            print("Generating LLM response with document context")
            response = self.model.generate_content(prompt)
            
            result = {
                'answer': response.text,
                'has_context': True,
                'sources': ['BankSecure AI Policy Documents']
            }
            
            # Cache the response
            self.response_cache[cache_key] = {
                'response': result,
                'timestamp': time.time()
            }
            
            return result
            
        except Exception as e:
            print(f"Error in RAG generation: {e}")
            # Return a helpful response with the context even if LLM fails
            if 'context' in locals() and context:
                return {
                    'answer': f"I found relevant information in our policy documents about your query, but I'm experiencing technical difficulties generating a response. Here's the relevant policy content:\n\n{context[:500]}...",
                    'has_context': True,
                    'sources': ['BankSecure AI Policy Documents']
                }
            return {
                'answer': "I'm having trouble accessing the policy information right now. Please try again.",
                'has_context': False,
                'sources': []
            }
