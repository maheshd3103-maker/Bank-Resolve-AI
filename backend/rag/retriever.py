from embeddings import EmbeddingGenerator
from vector_store import VectorStore
import os

class Retriever:
    def __init__(self, vector_store_path="rag_index.faiss", metadata_path="rag_metadata.pkl"):
        print("Initializing Retriever...")
        self.embedder = EmbeddingGenerator()
        self.vector_store = VectorStore()
        self.vector_store_path = vector_store_path
        self.metadata_path = metadata_path
        self._load_or_create_index()
    
    def _load_or_create_index(self):
        """Load existing index or create new one"""
        print("Loading or creating vector index...")
        if not self.vector_store.load_index():
            print("No existing index found. Creating new index...")
            self._create_index()
        else:
            print("Existing index loaded successfully")
    
    def _create_index(self):
        """Create new vector index from documents"""
        from document_loader import DocumentLoader
        
        print("Creating new vector index...")
        loader = DocumentLoader()
        documents = loader.load_all_documents()
        
        if not documents:
            raise ValueError("No documents found to index")
        
        print(f"Processing {len(documents)} document chunks...")
        
        # Extract just the text content for embedding
        texts = [doc['content'] for doc in documents]
        embeddings = self.embedder.generate_embeddings_batch(texts)
        
        if not embeddings:
            raise ValueError("Failed to generate embeddings")
        
        # Store documents with embeddings
        self.vector_store.create_index(embeddings, documents)
        self.vector_store.save_index()
        print("Index created and saved successfully")
    
    def retrieve(self, query, k=5, min_score=0.3):
        """Retrieve relevant documents for a query"""
        print(f"Retrieving documents for query: {query}")
        
        # Generate query embedding
        query_embedding = self.embedder.generate_query_embedding(query)
        if not query_embedding:
            print("Failed to generate query embedding")
            return []
        
        # Search vector store
        results = self.vector_store.search(query_embedding, k=k)
        print(f"Found {len(results)} initial results")
        
        # Filter by minimum score
        filtered_results = [r for r in results if r['score'] >= min_score]
        print(f"After filtering: {len(filtered_results)} results above threshold {min_score}")
        
        # Add relevance context
        for result in filtered_results:
            result['query'] = query
            result['relevance'] = self._calculate_relevance(result['score'])
        
        return filtered_results
    
    def _calculate_relevance(self, score):
        """Convert similarity score to relevance level"""
        if score >= 0.8:
            return "high"
        elif score >= 0.6:
            return "medium"
        elif score >= 0.3:
            return "low"
        else:
            return "very_low"
    
    def get_context(self, query, max_context_length=2000):
        """Get concatenated context from retrieved documents"""
        print(f"Getting context for query: {query}")
        results = self.retrieve(query)
        
        if not results:
            print("No relevant documents found")
            return ""
        
        context_parts = []
        current_length = 0
        
        for result in results:
            content = result['content']
            source = result['source']
            
            # Add source attribution
            attributed_content = f"[From {source}]: {content}"
            
            if current_length + len(attributed_content) <= max_context_length:
                context_parts.append(attributed_content)
                current_length += len(attributed_content)
                print(f"Added content from {source} (score: {result['score']:.3f})")
            else:
                break
        
        context = "\n\n".join(context_parts)
        print(f"Final context length: {len(context)} characters")
        return context

if __name__ == "__main__":
    # Test retrieval system
    retriever = Retriever()
    
    test_queries = [
        "What is KYC policy?",
        "How to handle refunds?",
        "Authentication requirements",
        "Transaction limits"
    ]
    
    for query in test_queries:
        print(f"\nQuery: {query}")
        results = retriever.retrieve(query, k=3)
        
        for i, result in enumerate(results):
            print(f"  {i+1}. Score: {result['score']:.3f}, Relevance: {result['relevance']}")
            print(f"     Source: {result['source']}")
            print(f"     Content: {result['content'][:100]}...")
        
        if not results:
            print("  No relevant documents found")