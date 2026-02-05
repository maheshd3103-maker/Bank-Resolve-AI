import React, { useState, useEffect } from 'react';
import Notification from '../Notification';
import './css/kyc-professional.css';

const KYCVerification = ({ setKycCompleted, onKycComplete }) => {
  const [uploads, setUploads] = useState({
    identityProof: null,
    addressProof: null,
    selfie: null
  });
  const [kycStatus, setKycStatus] = useState('loading');
  const [existingDocuments, setExistingDocuments] = useState([]);
  const [isUpdateMode, setIsUpdateMode] = useState(false);
  const [notification, setNotification] = useState(null);
  const [submissionStatus, setSubmissionStatus] = useState(null);
  const [referenceId, setReferenceId] = useState(null);

  useEffect(() => {
    checkKycStatus();
  }, []);

  const checkKycStatus = async () => {
    try {
      const userId = localStorage.getItem('user_id');
      const response = await fetch(`http://localhost:5000/api/kyc-status/${userId}`);
      const data = await response.json();
      
      if (data.success) {
        const status = data.kyc_status;
        setKycStatus(status);
        
        if (status === 'verified') {
          fetchExistingDocuments();
          setKycCompleted && setKycCompleted(true);
        } else if (status === 'pending') {
          setSubmissionStatus('submitted');
          // Get reference ID from KYC documents
          const kycResponse = await fetch(`http://localhost:5000/api/kyc-documents/${userId}`);
          const kycData = await kycResponse.json();
          if (kycData.success && kycData.kyc_id) {
            setReferenceId(`KYC-${kycData.kyc_id}`);
          }
        }
      }
    } catch (error) {
      console.error('Error checking KYC status:', error);
    }
  };

  const fetchExistingDocuments = async () => {
    try {
      const userId = localStorage.getItem('user_id');
      console.log('Fetching documents for user:', userId);
      const response = await fetch(`http://localhost:5000/api/kyc-documents/${userId}`);
      const data = await response.json();
      
      console.log('Documents API response:', data);
      
      if (data.success) {
        setExistingDocuments(data.documents || []);
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const formatDocumentType = (docType) => {
    const typeMap = {
      'aadhaar': 'Identity Proof',
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

  const isSubmitEnabled = uploads.identityProof && uploads.addressProof;

  const handleSubmit = async () => {
    if (!isSubmitEnabled) {
      alert('Please upload Identity Proof and Address Proof documents');
      return;
    }
    
    // Show initial submission notification
    setNotification({
      type: 'info',
      message: '📋 Documents submitted successfully! Processing in progress...'
    });
    setSubmissionStatus('submitted');
    setKycStatus('pending');
    
    try {
      const userId = localStorage.getItem('user_id');
      
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
        if (uploads.selfie) {
          formData.append('selfie', uploads.selfie);
        }
        formData.append('user_id', userId);
        
        const completeResponse = await fetch('http://localhost:5000/api/kyc/submit', {
          method: 'POST',
          body: formData
        });
        
        const completeData = await completeResponse.json();
        
        if (completeData.success) {
          const refId = completeData.kyc_id || 'KYC-' + Date.now();
          setReferenceId(refId);
          
          // Check if KYC was auto-approved
          if (completeData.status === 'verified' && completeData.auto_approved) {
            setTimeout(() => {
              setNotification({
                type: 'success',
                message: `🎉 KYC Auto-Approved! Documents matched your profile. Bank account created. Reference ID: ${refId}`
              });
              setKycStatus('verified');
              setKycCompleted && setKycCompleted(true);
              onKycComplete && onKycComplete();
            }, 2000);
          } else {
            // Update notification with reference ID
            setTimeout(() => {
              setNotification({
                type: 'info',
                message: `📋 Documents under review. Reference ID: ${refId}`
              });
            }, 1500);
            
            // Start polling for status updates
            setTimeout(() => {
              pollKycStatus();
            }, 5000);
          }
        } else {
          setNotification({
            type: 'error',
            message: 'Error: ' + (completeData.error || 'Unknown error occurred')
          });
          setSubmissionStatus(null);
          setKycStatus('loading');
        }
      } else {
        setNotification({
          type: 'error',
          message: 'Error: ' + kycData.error
        });
        setSubmissionStatus(null);
        setKycStatus('loading');
      }
    } catch (error) {
      console.error('KYC submission error:', error);
      setNotification({
        type: 'error',
        message: 'Error submitting KYC documents'
      });
      setSubmissionStatus(null);
      setKycStatus('loading');
    }
  };
  
  const pollKycStatus = async () => {
    try {
      const userId = localStorage.getItem('user_id');
      const response = await fetch(`http://localhost:5000/api/kyc-status/${userId}`);
      const data = await response.json();
      
      if (data.success && data.kyc_status === 'verified') {
        // Get KYC details for reference ID
        const kycResponse = await fetch(`http://localhost:5000/api/kyc-documents/${userId}`);
        const kycData = await kycResponse.json();
        
        let message = `KYC Approved! Your bank account has been created automatically with ₹0 balance.`;
        
        if (kycData.success && kycData.kyc_id) {
          message += ` Reference ID: KYC-${kycData.kyc_id}`;
        }
        
        setNotification({
          type: 'success',
          message: message
        });
        setKycStatus('verified');
        setKycCompleted && setKycCompleted(true);
        onKycComplete && onKycComplete();
      } else if (data.kyc_status === 'rejected') {
        setNotification({
          type: 'error',
          message: 'KYC verification failed. Please contact support or resubmit documents.'
        });
        setKycStatus('rejected');
        setSubmissionStatus('rejected');
      } else {
        // Continue polling if still pending
        setTimeout(() => {
          pollKycStatus();
        }, 10000);
      }
    } catch (error) {
      console.error('Error polling KYC status:', error);
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



  if (kycStatus === 'pending' && submissionStatus === 'submitted') {
    return (
      <div className="kyc-container">
        <h2>KYC Verification - In Progress</h2>
        
        <div className="kyc-progress-section">
          <div className="status-badge pending">
            ⏳ KYC Under Review
          </div>
          
          <div className="progress-info">
            <h3>Your documents are being verified</h3>
            <p>Reference ID: <strong>{referenceId}</strong></p>
            <p>Please wait while our AI system processes your documents. This usually takes 1-2 minutes.</p>
            
            <div className="progress-animation">
              <div className="spinner"></div>
              <span>Processing documents...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (kycStatus === 'rejected') {
    return (
      <div className="kyc-container">
        <h2>KYC Verification - Rejected</h2>
        
        <div className="kyc-rejected-section">
          <div className="status-badge rejected">
            ❌ KYC Rejected
          </div>
          
          <div className="rejection-info">
            <h3>Document verification failed</h3>
            <p>Reference ID: <strong>{referenceId}</strong></p>
            <p>Your documents could not be verified. Please check the document quality and resubmit.</p>
            
            <button className="resubmit-btn" onClick={() => {
              setKycStatus('loading');
              setSubmissionStatus(null);
              setUploads({ identityProof: null, addressProof: null, selfie: null });
            }}>
              Resubmit Documents
            </button>
          </div>
        </div>
      </div>
    );
  }

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
            {console.log('Rendering documents:', existingDocuments)}
            {existingDocuments && existingDocuments.length > 0 ? (
              existingDocuments.map((doc, index) => (
                <div key={index} className="document-item">
                  <span className="doc-type">{formatDocumentType(doc.document_type)}</span>
                  <a href={`http://localhost:5000/uploads/${doc.file_name}`} target="_blank" rel="noopener noreferrer" className="view-doc-btn">
                    View Document
                  </a>
                </div>
              ))
            ) : (
              <p>No documents found. Please contact support if this is an error.</p>
            )}
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
      <div className="kyc-container">
        {notification && (
          <Notification 
            type={notification.type}
            message={notification.message}
            onClose={() => setNotification(null)}
          />
        )}
        <h2>{isUpdateMode ? 'Update KYC Documents' : 'KYC Verification'}</h2>
        
        {isUpdateMode && (
          <div className="update-notice">
            <p>⚠️ Updating your KYC documents will require re-verification. Your account access may be temporarily restricted during review.</p>
            <button className="cancel-update-btn" onClick={() => setIsUpdateMode(false)}>Cancel Update</button>
          </div>
        )}
        
        <div className="kyc-form">
          <div className="document-upload-section">
            <h3>Required Documents</h3>
            
            <div className="kyc-upload-group">
              <label>Identity Proof *</label>
              <select className="kyc-doc-type-select">
                {identityDocs.map(doc => (
                  <option key={doc} value={doc}>{doc}</option>
                ))}
              </select>
              <input 
                type="file" 
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={(e) => handleFileUpload('identityProof', e.target.files[0])}
                className="kyc-file-input"
              />
              {uploads.identityProof && (
                <span className="kyc-file-selected">✓ {uploads.identityProof.name}</span>
              )}
            </div>

            <div className="kyc-upload-group">
              <label>Address Proof *</label>
              <select className="kyc-doc-type-select">
                {addressDocs.map(doc => (
                  <option key={doc} value={doc}>{doc}</option>
                ))}
              </select>
              <input 
                type="file" 
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={(e) => handleFileUpload('addressProof', e.target.files[0])}
                className="kyc-file-input"
              />
              {uploads.addressProof && (
                <span className="kyc-file-selected">✓ {uploads.addressProof.name}</span>
              )}
            </div>

            <div className="kyc-upload-group">
              <label>Selfie Photo (Optional)</label>
              <input 
                type="file" 
                accept=".jpg,.jpeg,.png"
                onChange={(e) => handleFileUpload('selfie', e.target.files[0])}
                className="kyc-file-input"
              />
              {uploads.selfie && (
                <span className="kyc-file-selected">✓ {uploads.selfie.name}</span>
              )}
            </div>
          </div>

          <div className="kyc-submit-section">
            <button 
              className={`kyc-submit-btn ${isSubmitEnabled ? 'enabled' : 'disabled'}`}
              onClick={handleSubmit}
              disabled={!isSubmitEnabled}
            >
              {submissionStatus === 'submitted' ? 'Processing...' : 'Submit KYC Documents'}
            </button>
            {!isSubmitEnabled && (
              <p className="kyc-submit-help">Upload Identity Proof and Address Proof to enable submission</p>
            )}
          </div>
        </div>
      </div>
  );
};

export default KYCVerification;