# vector_store.py

import faiss
import numpy as np
import pickle
import os


class VectorStore:
    def __init__(
        self,
        index_path="rag_index.faiss",
        metadata_path="rag_metadata.pkl"
    ):
        self.index_path = index_path
        self.metadata_path = metadata_path
        self.index = None
        self.metadata = []
        self.dimension = None

    def create_index(self, embeddings, documents):
        """Create FAISS index from embeddings and documents"""
        if not embeddings or not documents:
            raise ValueError("No embeddings or documents provided")

        # Detect embedding dimension dynamically
        self.dimension = len(embeddings[0])
        print(f"Creating index with dimension: {self.dimension}")

        # Cosine similarity using inner product
        self.index = faiss.IndexFlatIP(self.dimension)

        vectors = np.array(embeddings, dtype=np.float32)
        self.metadata = documents

        # Normalize vectors for cosine similarity
        faiss.normalize_L2(vectors)

        self.index.add(vectors)
        print(f"FAISS index created with {self.index.ntotal} vectors")

    def save_index(self):
        """Persist FAISS index and metadata"""
        if self.index is None:
            raise ValueError("Index not initialized")

        faiss.write_index(self.index, self.index_path)

        with open(self.metadata_path, "wb") as f:
            pickle.dump({
                "dimension": self.dimension,
                "metadata": self.metadata
            }, f)

        print("Index and metadata saved successfully")

    def load_index(self):
        """Load FAISS index and metadata"""
        if not os.path.exists(self.index_path) or not os.path.exists(self.metadata_path):
            return False

        self.index = faiss.read_index(self.index_path)

        with open(self.metadata_path, "rb") as f:
            data = pickle.load(f)
            self.dimension = data["dimension"]
            self.metadata = data["metadata"]

        print(f"Loaded FAISS index with {self.index.ntotal} vectors")
        return True

    def search(self, query_embedding, k=5):
        """Search similar vectors"""
        if self.index is None:
            raise ValueError("Index not loaded")

        query_vector = np.array([query_embedding], dtype=np.float32)
        faiss.normalize_L2(query_vector)

        scores, indices = self.index.search(query_vector, k)

        results = []
        for score, idx in zip(scores[0], indices[0]):
            if idx == -1:
                continue

            doc = self.metadata[idx]
            results.append({
                "score": float(score),
                "content": doc["content"],
                "source": doc["source"],
                "chunk_id": doc["chunk_id"],
                "metadata": doc.get("metadata", {})
            })

        return results
