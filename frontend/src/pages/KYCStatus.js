import React, { useState, useEffect } from 'react';
import { CheckCircle, Clock, XCircle, Upload } from 'lucide-react';
import { kycAPI, profileAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import '../styles/KYC.css';

const KYCStatus = () => {
  const { user } = useAuth();
  const [kycStatus, setKYCStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [files, setFiles] = useState({
    aadhaar: null,
    address_proof: null,
    selfie: null,
  });

  useEffect(() => {
    loadKYCStatus();
  }, [user?.id]);

  const loadKYCStatus = async () => {
    if (!user?.id) return;
    try {
      const response = await kycAPI.getKYCStatus(user.id);
      if (response.data.success) {
        setKYCStatus(response.data);
      }
    } catch (error) {
      console.error('Error loading KYC status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (type, file) => {
    setFiles({ ...files, [type]: file });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append('user_id', user.id);
    Object.keys(files).forEach(key => {
      if (files[key]) {
        formData.append(key, files[key]);
      }
    });

    try {
      const response = await kycAPI.submitKYC(formData);
      if (response.data.success) {
        alert(response.data.message);
        setShowUploadModal(false);
        loadKYCStatus();
      }
    } catch (error) {
      alert('Error submitting KYC: ' + error.message);
    }
  };

  const getStatusIcon = () => {
    switch (kycStatus?.kyc_status) {
      case 'verified':
        return <CheckCircle size={48} className="status-icon-verified" />;
      case 'pending':
        return <Clock size={48} className="status-icon-pending" />;
      case 'rejected':
        return <XCircle size={48} className="status-icon-rejected" />;
      default:
        return <Upload size={48} className="status-icon-default" />;
    }
  };

  const getStatusMessage = () => {
    switch (kycStatus?.kyc_status) {
      case 'verified':
        return 'Your KYC is verified! You can use all banking features.';
      case 'pending':
        return 'Your KYC is under review. We\'ll notify you once it\'s verified.';
      case 'rejected':
        return 'Your KYC was rejected. Please resubmit with valid documents.';
      default:
        return 'Complete your KYC to unlock all banking features.';
    }
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="loading-container">
          <div className="spinner"></div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="kyc-container">
        <div className="kyc-content">
          <h1 className="page-title">KYC Verification</h1>
          <p className="page-subtitle">Complete your verification to access all features</p>

          <div className="kyc-status-card card">
            <div className="status-display">
              {getStatusIcon()}
              <h2 className="status-title">
                {kycStatus?.kyc_status === 'verified' ? 'Verified' :
                 kycStatus?.kyc_status === 'pending' ? 'Pending Review' :
                 kycStatus?.kyc_status === 'rejected' ? 'Rejected' :
                 'Not Submitted'}
              </h2>
              <p className="status-message">{getStatusMessage()}</p>

              {kycStatus?.kyc_status !== 'verified' && (
                <button
                  className="btn btn-primary mt-3"
                  onClick={() => setShowUploadModal(true)}
                >
                  <Upload size={18} />
                  {kycStatus?.kyc_status === 'not_submitted' ? 'Start KYC' : 'Resubmit Documents'}
                </button>
              )}
            </div>

            {kycStatus?.account_info && (
              <div className="account-info-section">
                <h3>Account Information</h3>
                <div className="info-grid">
                  <div className="info-item">
                    <span className="info-label">Account Number</span>
                    <span className="info-value">{kycStatus.account_info.account_number}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Account Type</span>
                    <span className="info-value">{kycStatus.account_info.account_type}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">IFSC Code</span>
                    <span className="info-value">{kycStatus.account_info.ifsc_code}</span>
                  </div>
                  <div className="info-item">
                    <span className="info-label">Branch</span>
                    <span className="info-value">{kycStatus.account_info.branch_name}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* KYC Upload Modal */}
          {showUploadModal && (
            <div className="modal-overlay" onClick={() => setShowUploadModal(false)}>
              <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <h2>Upload KYC Documents</h2>
                  <button className="close-btn" onClick={() => setShowUploadModal(false)}>×</button>
                </div>
                <form onSubmit={handleSubmit} className="kyc-form">
                  <div className="form-group">
                    <label className="form-label">Aadhaar Card (PDF/Image)</label>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange('aadhaar', e.target.files[0])}
                      className="file-input"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Address Proof (PDF/Image)</label>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange('address_proof', e.target.files[0])}
                      className="file-input"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Selfie (Image)</label>
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png"
                      onChange={(e) => handleFileChange('selfie', e.target.files[0])}
                      className="file-input"
                      required
                    />
                  </div>
                  <div className="modal-actions">
                    <button type="button" className="btn btn-outline" onClick={() => setShowUploadModal(false)}>
                      Cancel
                    </button>
                    <button type="submit" className="btn btn-primary">
                      Submit KYC
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default KYCStatus;

