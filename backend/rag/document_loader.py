import os
from docx import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

class DocumentLoader:
    def __init__(self, documents_folder="rag_documents"):
        self.documents_folder = documents_folder
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=500,
            chunk_overlap=50
        )
    
    def load_docx(self, file_path):
        """Extract text from DOCX file"""
        doc = Document(file_path)
        text = []
        for paragraph in doc.paragraphs:
            if paragraph.text.strip():
                text.append(paragraph.text.strip())
        return "\n".join(text)
    
    def load_all_documents(self):
        """Load all DOCX files from documents folder"""
        documents = []
        
        for filename in os.listdir(self.documents_folder):
            if filename.endswith('.docx'):
                file_path = os.path.join(self.documents_folder, filename)
                text_content = self.load_docx(file_path)
                
                # Split into chunks
                chunks = self.text_splitter.split_text(text_content)
                
                # Add metadata to each chunk
                for i, chunk in enumerate(chunks):
                    documents.append({
                        'content': chunk,
                        'source': filename,
                        'chunk_id': f"{filename}_{i}",
                        'metadata': {
                            'source_file': filename,
                            'chunk_index': i
                        }
                    })
        
        return documents

if __name__ == "__main__":
    loader = DocumentLoader()
    docs = loader.load_all_documents()
    print(f"Loaded {len(docs)} document chunks")
    for doc in docs[:3]:
        print(f"Source: {doc['source']}, Content: {doc['content'][:100]}...")