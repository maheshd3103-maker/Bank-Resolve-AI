import React, { useState, useEffect } from 'react';

const KYCStatus = ({ onClose }) => {
  const [kycStatus, setKycStatus] = useState('loading');
  const [accountInfo, setAccountInfo] = useState(null);
  const [depositAmount, setDepositAmount] = useState('');
  const [isDepositing, setIsDepositing] = useState(false);

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
        setAccountInfo(data.account_info);
      }
    } catch (error) {
      console.error('Error checking KYC status:', error);
    }
  };

  const handleDeposit = async () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    setIsDepositing(true);
    try {
      const userId = localStorage.getItem('user_id');
      const response = await fetch('http://localhost:5000/api/deposit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          amount: parseFloat(depositAmount)
        })
      });

      const data = await response.json();
      if (data.success) {
        setAccountInfo(prev => ({
          ...prev,
          balance: data.new_balance
        }));
        setDepositAmount('');
        alert('Deposit successful!');
      } else {
        alert('Deposit failed: ' + data.message);
      }
    } catch (error) {
      console.error('Error making deposit:', error);
      alert('Deposit failed. Please try again.');
    } finally {
      setIsDepositing(false);
    }
  };

  const renderStatusContent = () => {
    switch (kycStatus) {
      case 'verified':
        return (
          <div className="kyc-success">
            <div className="success-icon">🎉</div>
            <h3>Congratulations! Your Account is Ready</h3>
            <p>Your KYC verification has been approved and your bank account has been created successfully.</p>
            
            {accountInfo && (
              <div className="account-details">
                <h4>Account Information:</h4>
                <div className="account-info">
                  <div className="info-row">
                    <span className="label">Account Number:</span>
                    <span className="value">{accountInfo.account_number}</span>
                    <span className="additional-info">
                      IFSC: BSAI0001234 | Branch: BankSecure Main Branch
                    </span>
                  </div>
                  <div className="info-row">
                    <span className="label">Account Type:</span>
                    <span className="value">{accountInfo.account_type}</span>
                  </div>
                  <div className="info-row">
                    <span className="label">Balance:</span>
                    <span className="value">₹{accountInfo.balance}</span>
                  </div>
                  <div className="deposit-section">
                    <div className="deposit-input">
                      <input
                        type="number"
                        placeholder="Enter amount"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        disabled={isDepositing}
                      />
                      <button 
                        className="deposit-btn" 
                        onClick={handleDeposit}
                        disabled={isDepositing}
                      >
                        {isDepositing ? 'Processing...' : 'Deposit'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <button className="continue-btn" onClick={onClose}>
              Continue to Dashboard
            </button>
          </div>
        );
      
      case 'pending':
        return (
          <div className="kyc-pending">
            <div className="pending-icon">⏳</div>
            <h3>KYC Under Review</h3>
            <p>Your documents are being reviewed by our team. You will be notified once the verification is complete.</p>
            <button className="continue-btn" onClick={onClose}>
              Continue
            </button>
          </div>
        );
      
      case 'rejected':
        return (
          <div className="kyc-rejected">
            <div className="rejected-icon">❌</div>
            <h3>KYC Verification Failed</h3>
            <p>Your KYC verification was not successful. Please contact support or resubmit your documents.</p>
            <button className="continue-btn" onClick={onClose}>
              Continue
            </button>
          </div>
        );
      
      default:
        return (
          <div className="kyc-loading">
            <div className="loading-icon">🔄</div>
            <h3>Checking Status...</h3>
          </div>
        );
    }
  };

  return (
    <div className="kyc-status-overlay">
      <div className="kyc-status-modal">
        <button className="close-btn" onClick={onClose}>×</button>
        {renderStatusContent()}
      </div>
    </div>
  );
};

export default KYCStatus;