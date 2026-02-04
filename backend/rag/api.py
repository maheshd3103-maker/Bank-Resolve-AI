from flask import Blueprint, request, jsonify
from rag_service import RAGService

# Create RAG blueprint
rag_bp = Blueprint('rag', __name__, url_prefix='/api/rag')

# Initialize RAG service (singleton)
rag_service = None

def get_rag_service():
    global rag_service
    if rag_service is None:
        rag_service = RAGService()
    return rag_service

@rag_bp.route('/query', methods=['POST'])
def rag_query():
    """RAG query endpoint"""
    try:
        data = request.get_json()
        
        if not data or 'question' not in data:
            return jsonify({
                'success': False,
                'error': 'Question is required'
            }), 400
        
        question = data['question'].strip()
        if not question:
            return jsonify({
                'success': False,
                'error': 'Question cannot be empty'
            }), 400
        
        # Get RAG response
        rag = get_rag_service()
        response = rag.query(question)
        
        return jsonify({
            'success': True,
            'answer': response['answer'],
            'sources': response['sources'],
            'has_context': response['has_context']
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': f'Internal server error: {str(e)}'
        }), 500

@rag_bp.route('/health', methods=['GET'])
def rag_health():
    """RAG service health check"""
    try:
        rag = get_rag_service()
        return jsonify({
            'success': True,
            'status': 'healthy',
            'service': 'RAG'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'status': 'unhealthy',
            'error': str(e)
        }), 500