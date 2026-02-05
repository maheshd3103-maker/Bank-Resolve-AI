import React, { useState } from 'react';
import './css/popup.css';
import Notification from '../Notification';

const Transfer = ({ kycCompleted, showKycRequired, onNavigateToKyc }) => {
  const [transferData, setTransferData] = useState({
    receiverName: '',
    receiverAccount: '',
    amount: '',
    description: ''
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [accountValidation, setAccountValidation] = useState(null);
  const [validatingAccount, setValidatingAccount] = useState(false);
  const [notification, setNotification] = useState(null);

  if (!kycCompleted) {
    return (
      <div className="transfer-container">
        {notification && (
          <Notification 
            type={notification.type}
            message={notification.message}
            onClose={() => setNotification(null)}
          />
        )}
        <div className="kyc-required">
          <div className="requirement-card">
            <div className="requirement-icon">🔒</div>
            <h3>KYC Verification Required</h3>
            <p>Please complete KYC verification to access money transfer feature.</p>
            <button onClick={() => onNavigateToKyc && onNavigateToKyc()} className="complete-profile-btn">
              Complete KYC Now
            </button>
          </div>
        </div>
      </div>
    );
  }


  const validateAccount = async () => {
    if (!transferData.receiverAccount || transferData.receiverAccount.length < 10) {
      setAccountValidation(null);
      return;
    }

    setValidatingAccount(true);
    try {
      const response = await fetch('http://localhost:5000/api/validate-account', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          account_number: transferData.receiverAccount
        })
      });

      const data = await response.json();
      setAccountValidation(data);
    } catch (error) {
      setAccountValidation({
        success: false,
        message: 'Unable to validate account'
      });
    } finally {
      setValidatingAccount(false);
    }
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('http://localhost:5000/api/transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...transferData,
          user_id: localStorage.getItem('user_id') || 1  // Get from login session
        })
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      setResult({
        transaction_id: 'N/A',
        status: 'NETWORK_ERROR',
        message: 'Network connection failed. Please check your internet connection.',
        timestamp: new Date().toISOString(),
        success: false
      });
    } finally {
      setLoading(false);
    }
  };





  return (
    <div className="transfer-container">
      {notification && (
        <Notification 
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}
      <h2>💸 Send Money</h2>
      
      <form onSubmit={handleTransfer} className="transfer-form">
        <div className="form-group">
          <label>Receiver Name *</label>
          <input 
            type="text"
            value={transferData.receiverName}
            onChange={(e) => setTransferData({...transferData, receiverName: e.target.value})}
            placeholder="Enter receiver name"
            required
          />
        </div>

        <div className="form-group">
          <label>Receiver Account Number *</label>
          <input 
            type="text"
            value={transferData.receiverAccount}
            onChange={(e) => {
              setTransferData({...transferData, receiverAccount: e.target.value});
              setAccountValidation(null);
            }}
            onBlur={validateAccount}
            placeholder="Enter receiver account number"
            required
          />
          {validatingAccount && (
            <div className="validation-status validating">
              🔍 Validating account...
            </div>
          )}
          {accountValidation && (
            <div className={`validation-status ${accountValidation.success ? 'valid' : 'invalid'}`}>
              {accountValidation.success ? (
                <>
                  ✅ {accountValidation.account_holder_name} - {accountValidation.bank_name}
                  <span className={`status-badge ${accountValidation.status}`}>
                    {accountValidation.status.toUpperCase()}
                  </span>
                </>
              ) : (
                <>
                  ❌ {accountValidation.message}
                  {accountValidation.status && (
                    <span className={`status-badge ${accountValidation.status}`}>
                      {accountValidation.status.toUpperCase()}
                    </span>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <div className="form-group">
          <label>Amount (₹) *</label>
          <input 
            type="number"
            value={transferData.amount}
            onChange={(e) => setTransferData({...transferData, amount: e.target.value})}
            placeholder="1000"
            min="1"
            required
          />
        </div>

        <div className="form-group">
          <label>Description</label>
          <input 
            type="text"
            value={transferData.description}
            onChange={(e) => setTransferData({...transferData, description: e.target.value})}
            placeholder="Transfer description"
          />
        </div>
        
        <button 
          type="submit" 
          className="transfer-btn" 
          disabled={loading || (accountValidation && !accountValidation.success)}
        >
          {loading ? 'Processing...' : '🚀 Send Money'}
        </button>
      </form>

      {result && (
        <div className="popup-overlay">
          <div className={`popup-content ${result.status === 'SUCCESS' ? 'success' : 'error'}`}>
            <button className="close-btn" onClick={() => setResult(null)}>×</button>
            <h3>Transaction Result</h3>
            <p><strong>Transaction ID:</strong> {result.transaction_id || 'N/A'}</p>
            <p><strong>Status:</strong> {result.status}</p>
            <p><strong>Message:</strong> {result.message}</p>
            <p><strong>Timestamp:</strong> {result.timestamp ? new Date(result.timestamp).toLocaleString() : new Date().toLocaleString()}</p>
            {result.requires_complaint && (
              <div className="complaint-notice">
                <p><strong>⚠️ Action Required:</strong> Money has been debited. Please raise a complaint to get your refund.</p>
                <button onClick={() => window.location.href = '#complaint'} className="complaint-btn">
                  Raise Complaint Now
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};



export default Transfer;