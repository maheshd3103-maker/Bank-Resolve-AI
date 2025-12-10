import React, { useState, useEffect } from 'react';

const DocumentViewer = ({ kycId, onClose }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState(null);

  useEffect(() => {
    fetchDocuments();
    
    const handleEscKey = (event) => {
      if (event.key === 'Escape') {
        if (selectedDocument) {
          setSelectedDocument(null);
        } else {
          onClose();
        }
      }
    };
    
    document.addEventListener('keydown', handleEscKey);
    return () => document.removeEventListener('keydown', handleEscKey);
  }, [kycId, selectedDocument, onClose]);

  const fetchDocuments = async () => {
    try {
      console.log('Fetching documents for KYC ID:', kycId);
      const response = await fetch(`http://localhost:5000/api/manager/kyc-documents/${kycId}`);
      const data = await response.json();
      console.log('API Response:', data);
      console.log('Documents array:', data.documents);
      console.log('Documents length:', data.documents ? data.documents.length : 0);
      
      if (data.success) {
        console.log('Documents found:', data.documents);
        setDocuments(data.documents || []);
      } else {
        console.error('API Error:', data.error);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentClick = (document) => {
    setSelectedDocument(document);
  };

  const closeDocumentView = () => {
    setSelectedDocument(null);
  };

  const getDocumentTitle = (type) => {
    switch(type) {
      case 'identity_proof': return 'Identity Proof Document';
      case 'address_proof': return 'Address Proof Document';
      case 'selfie': return 'Photograph/Selfie';
      default: return 'Document';
    }
  };

  const getDocumentPurpose = (type) => {
    switch(type) {
      case 'identity_proof': return 'For identity verification (Aadhaar/PAN/Passport)';
      case 'address_proof': return 'For address verification';
      case 'selfie': return 'For face verification and matching';
      default: return 'KYC verification';
    }
  };

  const getNumberLabel = (type, extractedNumber) => {
    if (!extractedNumber) return null;
    
    // Check if it's Aadhaar format (XXXX XXXX XXXX)
    if (extractedNumber.includes(' ') && extractedNumber.replace(/\s/g, '').length === 12) {
      return 'Aadhaar Number';
    }
    // Check if it's PAN format (ABCDE1234F)
    if (extractedNumber.length === 10 && /^[A-Z]{5}\d{4}[A-Z]$/.test(extractedNumber)) {
      return 'PAN Number';
    }
    
    switch(type) {
      case 'aadhaar':
      case 'identity_proof': 
      case 'address_proof': 
        return 'Aadhaar Number';
      case 'pan': 
        return 'PAN Number';
      default: 
        return 'Document Number';
    }
  };

  if (loading) {
    return (
      <div className="document-viewer-overlay">
        <div className="document-viewer">
          <div className="loading">Loading documents...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="document-viewer-overlay" onClick={onClose}>
      <div className="document-viewer" onClick={(e) => e.stopPropagation()}>
        <div className="document-viewer-header">
          <h3>Uploaded Documents</h3>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="document-viewer-content">
          {documents.length === 0 ? (
            <div className="no-documents">No documents found</div>
          ) : (
            <div className="documents-list">
              {documents.map((doc) => (
                <div key={doc.id} className="document-item">
                  <div className="document-header">
                    <div className="document-icon">
                      {doc.mime_type?.includes('image') ? '🖼️' : '📄'}
                    </div>
                    <div className="document-title">
                      <h4>{getDocumentTitle(doc.document_type)}</h4>
                      <span className="document-purpose">{getDocumentPurpose(doc.document_type)}</span>
                    </div>
                  </div>
                  <div className="document-details">
                    <div className="detail-row">
                      <span className="label">File Name:</span>
                      <span className="value">{doc.file_name}</span>
                    </div>
                    <div className="detail-row">
                      <span className="label">Size:</span>
                      <span className="value">{(doc.file_size / 1024).toFixed(1)} KB</span>
                    </div>
                    {doc.extracted_number && (
                      <div className="detail-row">
                        <span className="label">{getNumberLabel(doc.document_type, doc.extracted_number)}:</span>
                        <span className="value extracted-number">{doc.extracted_number}</span>
                      </div>
                    )}
                    <div className="detail-row">
                      <span className="label">Uploaded:</span>
                      <span className="value">{new Date(doc.uploaded_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="document-actions">
                    <button className="view-btn" onClick={() => handleDocumentClick(doc)}>
                      View Document
                    </button>
                    <a 
                      href={`http://localhost:5000/api/documents/${doc.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="download-btn"
                    >
                      Download
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {selectedDocument && (
          <div className="document-preview-overlay" onClick={closeDocumentView}>
            <div className="document-preview" onClick={(e) => e.stopPropagation()}>
              <div className="document-preview-header">
                <h4>{selectedDocument.file_name}</h4>
                <button className="close-btn" onClick={closeDocumentView}>×</button>
              </div>
              <div className="document-preview-content">
                {selectedDocument.mime_type?.includes('image') ? (
                  <img 
                    src={`http://localhost:5000/api/documents/${selectedDocument.id}`}
                    alt={selectedDocument.file_name}
                    className="document-image"
                  />
                ) : (
                  <div className="document-placeholder">
                    <p>Document preview not available</p>
                    <a 
                      href={`http://localhost:5000/api/documents/${selectedDocument.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="download-link"
                    >
                      Download Document
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentViewer;