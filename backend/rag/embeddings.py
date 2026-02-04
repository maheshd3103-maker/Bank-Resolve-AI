# embeddings.py

import os
import time
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()


class EmbeddingGenerator:
    def __init__(self):
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key:
            raise ValueError("GOOGLE_API_KEY not found in environment variables")

        genai.configure(api_key=api_key)
        self.model = "models/text-embedding-004"

    def generate_embedding(self, text: str):
        """Generate embedding for a single document chunk"""
        if not text or not text.strip():
            return None

        try:
            result = genai.embed_content(
                model=self.model,
                content=text,
                task_type="retrieval_document"
            )
            return result["embedding"]

        except Exception as e:
            print(f"[Embedding Error] {e}")
            return None

    def generate_embeddings_batch(self, texts, batch_size=5):
        """Generate embeddings for multiple text chunks"""
        embeddings = []
        
        print(f"Generating embeddings for {len(texts)} texts...")

        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]

            for text in batch:
                embedding = self.generate_embedding(text)
                if embedding:
                    embeddings.append(embedding)
                else:
                    print(f"Failed to generate embedding for text: {text[:50]}...")

                time.sleep(0.15)  # Gemini rate-limit safety

            print(f"Embedded {len(embeddings)} / {len(texts)} chunks")

        return embeddings

    def generate_query_embedding(self, query: str):
        """Generate embedding for user query"""
        if not query or not query.strip():
            return None

        try:
            result = genai.embed_content(
                model=self.model,
                content=query,
                task_type="retrieval_query"
            )
            return result["embedding"]

        except Exception as e:
            print(f"[Query Embedding Error] {e}")
            return None
