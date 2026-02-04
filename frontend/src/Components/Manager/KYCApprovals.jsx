import React, { useState } from 'react';
import DocumentViewer from './DocumentViewer';

const KYCApprovals = () => {
  const [kycApplications, setKycApplications] = useState([]);
  const [approvedApplications, setApprovedApplications] = useState([]);
  const [showDocumentViewer, setShowDocumentViewer] = useState(false);
  const [selectedKycId, setSelectedKycId] = useState(null);
  const [activeView, setActiveView] = useState('pending');
  const [stats, setStats] = useState({ pending: 0, firstApproved: 0, verified: 0, rejected: 0 });
  const [showDetails, setShowDetails] = useState({});
  const [showDocuments, setShowDocuments] = useState({});

  // Helper functions for match display
  const getMatchStatus = (profileValue, extractedValue) => {
    if (!profileValue && !extractedValue) return 'unknown';
    if (!profileValue || !extractedValue) return 'partial';
    return profileValue === extractedValue ? 'matched' : 'mismatched';
  };

  const getMatchDisplay = (profileValue, extractedValue, type) => {
    // Show extracted value if it exists
    if (extractedValue && extractedValue !== 'Not extracted' && extractedValue !== 'null' && extractedValue !== null && extractedValue !== '') {
      if (profileValue && profileValue !== 'null' && profileValue !== null && profileValue !== '') {
        // Both values exist - compare them
        const cleanExtracted = String(extractedValue).replace(/\s+/g, '');
        const cleanProfile = String(profileValue).replace(/\s+/g, '');
        
        if (cleanExtracted === cleanProfile) {
          return `✅ ${extractedValue}`;
        } else {
          return `❌ ${extractedValue} ≠ ${profileValue}`;
        }
      } else {
        // Only extracted value exists
        return `✅ ${extractedValue}`;
      }
    } else {
      // Show profile value when no extraction
      if (profileValue && profileValue !== 'null' && profileValue !== null && profileValue !== '') {
        return `📋 ${profileValue}`;
      }
      return `No ${type.toLowerCase()} data`;
    }
  };

  const getNameMatchStatus = (similarity) => {
    if (!similarity) return 'unknown';
    return similarity >= 0.8 ? 'matched' : 'mismatched';
  };

  const getNameMatchDisplay = (similarity, extractedName, profileName) => {
    if (extractedName && extractedName !== 'Not extracted' && extractedName !== 'null' && extractedName !== null && extractedName !== '') {
      if (similarity && similarity >= 0.8) {
        return `✅ ${extractedName}`;
      } else if (similarity) {
        return `❌ ${extractedName}`;
      } else {
        return `✅ ${extractedName}`;
      }
    } else {
      // Show profile name when no extraction
      if (profileName && profileName !== 'null' && profileName !== null && profileName !== '') {
        return `📋 ${profileName}`;
      }
      return 'No name data';
    }
  };

  const getFaceMatchStatus = (similarity) => {
    if (!similarity) return 'unknown';
    return similarity >= 0.7 ? 'matched' : 'mismatched';
  };

  const getFaceMatchDisplay = (similarity) => {
    if (similarity && similarity > 0) {
      const percentage = (similarity * 100).toFixed(1);
      if (similarity >= 0.7) {
        return `✅ Verified (${percentage}%)`;
      } else {
        return `❌ Failed (${percentage}%)`;
      }
    }
    return 'No face data';
  };

  const toggleDetails = (appId) => {
    setShowDetails(prev => ({
      ...prev,
      [appId]: !prev[appId]
    }));
  };

  const toggleDocuments = (appId) => {
    setShowDocuments(prev => ({
      ...prev,
      [appId]: !prev[appId]
    }));
  };

  const fetchKYCApplications = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/manager/kyc-applications');
      console.log('API Response Status:', response.status);
      console.log('API Response URL:', response.url);
      const data = await response.json();
      console.log('KYC Applications Data:', data);
      console.log('Applications count:', data.applications ? data.applications.length : 0);
      if (data.success) {
        // Debug log first application
        if (data.applications.length > 0) {
          console.log('First application data:', data.applications[0]);
        }
        const pending = data.applications.filter(app => app.status === 'pending');
        const approved = data.applications.filter(app => app.status === 'verified' || app.status === 'rejected');
        
        setKycApplications(pending);
        setApprovedApplications(approved);
        
        // Update stats
        const newStats = {
          pending: data.applications.filter(app => app.status === 'pending').length,
          verified: data.applications.filter(app => app.status === 'verified').length,
          rejected: data.applications.filter(app => app.status === 'rejected').length
        };
        setStats(newStats);
      }
    } catch (error) {
      console.error('Error fetching KYC applications:', error);
    }
  };

  React.useEffect(() => {
    fetchKYCApplications();
  }, []);

  const handleApprove = async (id) => {
    const managerId = prompt('Enter your Manager ID:');
    if (!managerId) return;
    
    const reason = prompt('Enter approval reason (optional):') || 'KYC documents verified';
    
    try {
      const response = await fetch('http://localhost:5000/api/manager/kyc-approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kyc_id: id, manager_id: managerId, reason })
      });
      
      const data = await response.json();
      if (data.success) {
        alert(data.message);
        fetchKYCApplications(); // Refresh list
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Error approving KYC:', error);
      alert('Error approving KYC');
    }
  };
  
  const handleReject = async (id) => {
    const managerId = prompt('Enter your Manager ID:');
    if (!managerId) return;
    
    const reason = prompt('Enter rejection reason:');
    if (!reason) return;
    
    try {
      const response = await fetch('http://localhost:5000/api/manager/kyc-reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kyc_id: id, manager_id: managerId, reason })
      });
      
      const data = await response.json();
      if (data.success) {
        alert(data.message);
        fetchKYCApplications();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      console.error('Error rejecting KYC:', error);
    }
  };

  const handleViewDocuments = (id) => {
    setSelectedKycId(id);
    setShowDocumentViewer(true);
  };

  const closeDocumentViewer = () => {
    setShowDocumentViewer(false);
    setSelectedKycId(null);
  };

  return (
    <div className="manager-section">
      <h2>KYC Approvals</h2>
      
      <div className="kyc-tabs">
        <button 
          className={activeView === 'pending' ? 'active' : ''} 
          onClick={() => setActiveView('pending')}
        >
          Pending ({stats.pending})
        </button>
        <button 
          className={activeView === 'approved' ? 'active' : ''} 
          onClick={() => setActiveView('approved')}
        >
          Approved ({stats.verified + stats.rejected})
        </button>
      </div>

      <div className="kyc-applications">
        {(() => {
          let displayApplications = [];
          let emptyMessage = '';
          
          if (activeView === 'pending') {
            displayApplications = kycApplications.filter(app => app.status === 'pending');
            emptyMessage = 'No pending KYC applications';
          } else if (activeView === 'approved') {
            displayApplications = approvedApplications.filter(app => app.status === 'verified' || app.status === 'rejected');
            emptyMessage = 'No processed applications';
          }
          
          return displayApplications.length === 0 ? (
            <div className="no-data">{emptyMessage}</div>
          ) : (
            displayApplications.map((application, index) => (
              <div key={`kyc-${application.id}-${index}`} className="kyc-card">
                <div className="kyc-header">
                  <h3>{application.userName}</h3>
                  <span className={`status ${application.status.toLowerCase().replace('_', '-')}`}>
                    {application.status === 'verified' ? 'Approved' : 
                     application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                  </span>
                </div>
                <div className="kyc-details">
                  <p><strong>Email:</strong> {application.email}</p>
                  <p><strong>Submitted:</strong> {new Date(application.submittedDate).toLocaleDateString()}</p>
                  {application.status === 'verified' && (
                    <>
                      <p><strong>Profile Aadhaar:</strong> {application.profile_aadhaar || 'Not provided'}</p>
                      <p><strong>Profile PAN:</strong> {application.profile_pan || 'Not provided'}</p>
                      <p><strong>Extracted Name:</strong> {application.extracted_name || 'Not extracted'}</p>
                    </>
                  )}
                  <p><strong>Documents:</strong> {application.document_type}</p>
                </div>
                <div className="ai-feedback-section">
                  <h4>AI Verification Result:</h4>
                  <div className="confidence-score">
                    Overall Confidence: {application.confidence_score ? `${(application.confidence_score * 100).toFixed(1)}%` : 'Processing...'}
                  </div>
                  
                  {/* Document Match Results */}
                  <div className="match-results">
                    <div className="match-item">
                      <span className="match-label">📄 Aadhaar Number:</span>
                      <span className={`match-status ${getMatchStatus(application.profile_aadhaar, application.extracted_aadhaar)}`}>
                        {(() => {
                          console.log('Aadhaar Debug:', {
                            profile: application.profile_aadhaar,
                            extracted: application.extracted_aadhaar,
                            type: typeof application.extracted_aadhaar
                          });
                          return getMatchDisplay(application.profile_aadhaar, application.extracted_aadhaar, 'Aadhaar');
                        })()}
                      </span>
                    </div>
                    
                    <div className="match-item">
                      <span className="match-label">🆔 PAN Number:</span>
                      <span className={`match-status ${getMatchStatus(application.profile_pan, application.extracted_pan)}`}>
                        {getMatchDisplay(application.profile_pan, application.extracted_pan, 'PAN')}
                      </span>
                    </div>
                    
                    <div className="match-item">
                      <span className="match-label">👤 Name Match:</span>
                      <span className={`match-status ${getNameMatchStatus(application.name_similarity)}`}>
                        {getNameMatchDisplay(application.name_similarity, application.extracted_name, application.userName)}
                      </span>
                    </div>
                    
                    <div className="match-item">
                      <span className="match-label">🖼️ Face Verification:</span>
                      <span className={`match-status ${getFaceMatchStatus(application.face_similarity)}`}>
                        {getFaceMatchDisplay(application.face_similarity)}
                      </span>
                    </div>
                  </div>
                  
                  <button 
                    className="view-details-btn"
                    onClick={() => toggleDetails(application.id)}
                  >
                    {showDetails[application.id] ? 'Hide Details' : 'View Details'}
                  </button>
                  
                  {showDetails[application.id] && (
                    <div className="verification-details">
                      <h5>Detailed Comparison:</h5>
                      
                      <div className="detail-item">
                        <strong>📄 Aadhaar Number:</strong>
                        <div className="comparison">
                          <div className="profile-data">Profile: {application.profile_aadhaar || 'Not provided'}</div>
                          <div className="extracted-data">Extracted: {application.extracted_aadhaar || 'Not extracted'}</div>
                          <div className={`match-result ${getMatchStatus(application.profile_aadhaar, application.extracted_aadhaar)}`}>
                            {getMatchDisplay(application.profile_aadhaar, application.extracted_aadhaar, 'Aadhaar')}
                          </div>
                        </div>
                      </div>
                      
                      <div className="detail-item">
                        <strong>🆔 PAN Number:</strong>
                        <div className="comparison">
                          <div className="profile-data">Profile: {application.profile_pan || 'Not provided'}</div>
                          <div className="extracted-data">Extracted: {application.extracted_pan || 'Not extracted'}</div>
                          <div className={`match-result ${getMatchStatus(application.profile_pan, application.extracted_pan)}`}>
                            {getMatchDisplay(application.profile_pan, application.extracted_pan, 'PAN')}
                          </div>
                        </div>
                      </div>
                      
                      <div className="detail-item">
                        <strong>👤 Name Comparison:</strong>
                        <div className="comparison">
                          <div className="profile-data">Profile: {application.userName || 'Not provided'}</div>
                          <div className="extracted-data">Extracted: {application.extracted_name || 'Not extracted'}</div>

                          <div className={`match-result ${getNameMatchStatus(application.name_similarity)}`}>
                            {application.name_similarity >= 0.8 ? 'Names match well' : 'Names do not match sufficiently'}
                          </div>
                        </div>
                      </div>
                      
                      <div className="detail-item">
                        <strong>🖼️ Face Verification:</strong>
                        <div className="comparison">
                          <div className="similarity-score">
                            Confidence: {application.face_similarity ? `${(application.face_similarity * 100).toFixed(1)}%` : 'Not processed'}
                          </div>
                          <div className={`match-result ${getFaceMatchStatus(application.face_similarity)}`}>
                            {application.face_similarity >= 0.7 ? 'Face verification passed' : 'Face verification failed'}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="ai-feedback">
                    {application.feedback_text ? (
                      application.feedback_text.split('\n').map((line, idx) => (
                        <div key={idx} className="feedback-line">{line}</div>
                      ))
                    ) : (
                      <div className="feedback-line">AI verification in progress...</div>
                    )}
                  </div>
                </div>
                <div className="kyc-actions">
                  <button className="view-docs-btn" onClick={() => toggleDocuments(application.id)}>
                    {showDocuments[application.id] ? 'Hide Documents' : 'View Documents'}
                  </button>
                  {application.status === 'pending' && (
                    <>
                      <button className="approve-btn" onClick={() => handleApprove(application.id)}>
                        Approve
                      </button>
                      <button className="reject-btn" onClick={() => handleReject(application.id)}>
                        Reject
                      </button>
                    </>
                  )}
                  {(application.status === 'verified' || application.status === 'rejected') && (
                    <div className="final-status">
                      {application.status === 'verified' ? '✅ Approved' : '❌ Rejected'}
                    </div>
                  )}
                </div>
                
                {showDocuments[application.id] && (
                  <div className="documents-section">
                    <h4>📄 Uploaded Documents</h4>
                    {application.status === 'verified' && (
                      <div className="user-account-info">
                        <h5>✅ Account Created Successfully</h5>
                        <p><strong>Status:</strong> KYC Verified & Account Active</p>
                      </div>
                    )}
                    <div className="documents-grid">
                      {application.documents?.aadhaar && (
                        <div className="document-item">
                          <span className="doc-type">🆔 Aadhaar/PAN Card</span>
                          <a href={`http://localhost:5000/uploads/${application.documents.aadhaar}`} target="_blank" rel="noopener noreferrer" className="view-doc-link">
                            View Document
                          </a>
                        </div>
                      )}
                      {application.documents?.address_proof && (
                        <div className="document-item">
                          <span className="doc-type">📋 Address Proof</span>
                          <a href={`http://localhost:5000/uploads/${application.documents.address_proof}`} target="_blank" rel="noopener noreferrer" className="view-doc-link">
                            View Document
                          </a>
                        </div>
                      )}
                      {application.documents?.selfie && (
                        <div className="document-item">
                          <span className="doc-type">🤳 Selfie</span>
                          <a href={`http://localhost:5000/uploads/${application.documents.selfie}`} target="_blank" rel="noopener noreferrer" className="view-doc-link">
                            View Document
                          </a>
                        </div>
                      )}
                    </div>
                  </div>
                )}}
              </div>
            ))
          );
        })()}
      </div>
      
      {showDocumentViewer && (
        <DocumentViewer 
          kycId={selectedKycId} 
          onClose={closeDocumentViewer}
        />
      )}
    </div>
  );
};

export default KYCApprovals;