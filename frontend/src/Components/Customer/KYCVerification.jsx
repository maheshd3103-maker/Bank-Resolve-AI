import React, { useState, useEffect } from 'react';

const KYCVerification = ({ setKycCompleted, onKycComplete }) => {
  const [activeStep, setActiveStep] = useState(1);
  const [uploads, setUploads] = useState({
    identityProof: null,
    addressProof: null,
    selfie: null
  });
  const [kycStatus, setKycStatus] = useState('loading');
  const [existingDocuments, setExistingDocuments] = useState([]);
  const [isUpdateMode, setIsUpdateMode] = useState(false);

  useEffect(() => {
    checkKycStatus();
  }, []);

  const checkKycStatus = async () => {
    try {
      const userId = localStorage.getItem('user_id');
      const response = await fetch(`http://localhost:5000/api/kyc-status/${userId}`);
      const data = await response.json();
      
      if (data.success) {
        setKycStatus(data.kyc_status);
        if (data.kyc_status === 'verified') {
          fetchExistingDocuments();
        }
      }
    } catch (error) {
      console.error('Error checking KYC status:', error);
    }
  };

  const fetchExistingDocuments = async () => {
    try {
      const userId = localStorage.getItem('user_id');
      const response = await fetch(`http://localhost:5000/api/kyc-documents/${userId}`);
      const data = await response.json();
      
      if (data.success) {
        setExistingDocuments(data.documents);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const formatDocumentType = (docType) => {
    const typeMap = {
      'aadhaar': 'Aadhaar Card',
      'address_proof': 'Address Proof',
      'selfie': 'Selfie Photo'
    };
    return typeMap[docType] || docType;
  };

  const identityDocs = [
    'Aadhaar Card', 'PAN Card', 'Passport', 'Voter ID', 
    'Driving License', 'NREGA Job Card', 'Photo Bank Passbook'
  ];

  const addressDocs = [
    'Aadhaar Card', 'Passport', 'Rent Agreement', 'Electricity Bill',
    'Water Bill', 'Gas Bill', 'Landline/Postpaid Bill', 
    'Bank Statement', 'Driving License'
  ];

  const handleFileUpload = (type, file) => {
    // Check file size (50MB limit)
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file && file.size > maxSize) {
      alert(`File size too large. Please upload files smaller than 50MB.\nCurrent file size: ${(file.size / (1024 * 1024)).toFixed(1)}MB`);
      return;
    }
    setUploads({...uploads, [type]: file});
  };

  const handleSubmit = async () => {
    if (!uploads.identityProof || !uploads.addressProof || !uploads.selfie) {
      alert('Please upload all required documents');
      return;
    }
    
    try {
      // Check if profile photo exists for face verification
      const userId = localStorage.getItem('user_id');
      const profilePhoto = localStorage.getItem(`profile_photo_${userId}`);
      
      // First create KYC record
      const kycResponse = await fetch('http://localhost:5000/api/kyc/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId
        }),
      });
      
      const kycData = await kycResponse.json();
      
      if (kycData.success) {
        const kycId = kycData.kyc_id;
        
        // Upload documents
        const formData = new FormData();
        formData.append('aadhaar', uploads.identityProof);
        formData.append('address_proof', uploads.addressProof);
        formData.append('selfie', uploads.selfie);
        formData.append('user_id', userId);
        
        console.log('DEBUG: Files being uploaded:', {
          aadhaar: `${(uploads.identityProof?.size / (1024*1024)).toFixed(2)}MB`,
          address: `${(uploads.addressProof?.size / (1024*1024)).toFixed(2)}MB`,
          selfie: `${(uploads.selfie?.size / (1024*1024)).toFixed(2)}MB`
        });
        
        const completeResponse = await fetch('http://localhost:5000/api/kyc/submit', {
          method: 'POST',
          body: formData
        });
        
        const completeData = await completeResponse.json();
        
        if (completeData.success) {
          let message = 'KYC documents submitted for verification!';
          
          // Add face verification result to message
          if (completeData.face_match_result) {
            const faceMatch = completeData.face_match_result;
            if (faceMatch.match) {
              message += `\n✅ Face verification: PASSED (${(faceMatch.confidence * 100).toFixed(1)}% match)`;
            } else {
              message += `\n❌ Face verification: FAILED`;
            }
          }
          
          alert(message);
          setKycCompleted && setKycCompleted(true);
          onKycComplete && onKycComplete();
        } else {
          let errorMsg = completeData.error;
          if (errorMsg.includes('File size too large')) {
            errorMsg = 'One or more files are too large. Please compress your documents and try again.\nMaximum file size: 50MB per file';
          }
          alert('Error in complete verification: ' + errorMsg);
        }
      } else {
        alert('Error submitting KYC: ' + kycData.error);
      }
    } catch (error) {
      console.error('KYC submission error:', error);
      alert('Error submitting KYC documents');
    }
  };
  
  const uploadDocument = async (file, documentType, userId, kycId) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', documentType);
    formData.append('user_id', userId);
    formData.append('kyc_id', kycId);
    
    const response = await fetch('http://localhost:5000/api/extract-document', {
      method: 'POST',
      body: formData
    });
    
    return response.json();
  };



  if (kycStatus === 'verified' && !isUpdateMode) {
    return (
      <div className="feature-container">
        <h2>KYC Verification - Completed</h2>
        
        <div className="kyc-completed-section">
          <div className="status-badge verified">
            ✅ KYC Verified
          </div>
          
          <div className="existing-documents">
            <h3>Your Uploaded Documents</h3>
            {existingDocuments.map((doc, index) => (
              <div key={index} className="document-item">
                <span className="doc-type">{formatDocumentType(doc.document_type)}</span>
                <a href={`http://localhost:5000/uploads/${doc.file_name}`} target="_blank" rel="noopener noreferrer" className="view-doc-btn">
                  View Document
                </a>
              </div>
            ))}
          </div>
          
          <div className="kyc-actions">
            <button className="update-kyc-btn" onClick={() => setIsUpdateMode(true)}>
              Update KYC Documents
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="feature-container">
      <h2>{isUpdateMode ? 'Update KYC Documents' : 'KYC Verification'}</h2>
      
      {isUpdateMode && (
        <div className="update-notice">
          <p>⚠️ Updating your KYC documents will require re-verification. Your account access may be temporarily restricted during review.</p>
          <button className="cancel-update-btn" onClick={() => setIsUpdateMode(false)}>Cancel Update</button>
        </div>
      )}
      
      <div className="kyc-steps">
        <div className={`kyc-step ${activeStep === 1 ? 'active' : ''}`}>
          <div className="step-header">
            <span className="step-number">1</span>
            <h3>Identity Proof (Any ONE Required)</h3>
          </div>
          <div className="form-group">
            <label>Select Document Type</label>
            <select>
              <option value="">Choose Identity Document</option>
              {identityDocs.map((doc, index) => (
                <option key={index} value={doc}>{doc}</option>
              ))}
            </select>
          </div>
          <div className="upload-section">
            <input 
              type="file" 
              accept="image/*,application/pdf"
              onChange={(e) => handleFileUpload('identityProof', e.target.files[0])}
              disabled={kycStatus === 'verified' && !isUpdateMode}
            />
            {uploads.identityProof && <span className="upload-success">✅ Uploaded</span>}
          </div>
        </div>

        <div className={`kyc-step ${activeStep === 2 ? 'active' : ''}`}>
          <div className="step-header">
            <span className="step-number">2</span>
            <h3>Address Proof (Any ONE Required)</h3>
          </div>
          <div className="form-group">
            <label>Select Document Type</label>
            <select>
              <option value="">Choose Address Document</option>
              {addressDocs.map((doc, index) => (
                <option key={index} value={doc}>{doc}</option>
              ))}
            </select>
          </div>
          <div className="upload-section">
            <input 
              type="file" 
              accept="image/*,application/pdf"
              onChange={(e) => handleFileUpload('addressProof', e.target.files[0])}
              disabled={kycStatus === 'verified' && !isUpdateMode}
            />
            {uploads.addressProof && <span className="upload-success">✅ Uploaded</span>}
          </div>
        </div>

        <div className={`kyc-step ${activeStep === 3 ? 'active' : ''}`}>
          <div className="step-header">
            <span className="step-number">3</span>
            <h3>Photograph / Selfie</h3>
          </div>
          <p>For AI-based face verification (clear selfie required)</p>
          <div className="info-banner">
            <span className="banner-icon">🤖</span>
            <div className="banner-text">
              <strong>AI Verification:</strong> Your selfie will be processed using advanced AI for identity verification.
            </div>
          </div>
          <div className="upload-section">
            <input 
              type="file" 
              accept="image/*"
              capture="user"
              onChange={(e) => handleFileUpload('selfie', e.target.files[0])}
              disabled={kycStatus === 'verified' && !isUpdateMode}
            />
            {uploads.selfie && <span className="upload-success">✅ Uploaded</span>}
          </div>
        </div>
      </div>

      <div className="kyc-navigation">
        <button 
          onClick={() => setActiveStep(Math.max(1, activeStep - 1))}
          disabled={activeStep === 1}
        >
          Previous
        </button>
        {activeStep < 3 ? (
          <button onClick={() => setActiveStep(activeStep + 1)}>Next</button>
        ) : (
          <button 
            onClick={handleSubmit}
            className="submit-kyc"
            disabled={!uploads.identityProof || !uploads.addressProof || !uploads.selfie}
          >
            Submit for Verification
          </button>
        )}
      </div>
    </div>
  );
};

export default KYCVerification;