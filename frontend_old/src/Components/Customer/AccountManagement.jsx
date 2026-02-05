import React, { useState, useEffect } from 'react';
import './css/account-professional.css';

const AccountManagement = ({ kycCompleted, showKycRequired, onNavigateToKyc }) => {
  const [accounts, setAccounts] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDepositForm, setShowDepositForm] = useState(false);
  const [depositAmount, setDepositAmount] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const userId = localStorage.getItem('user_id');
      const response = await fetch(`http://localhost:5000/api/profile/${userId}`);
      const data = await response.json();
      
      if (data.success) {
        setProfile(data.profile);
        if (data.profile.account_number) {
          setAccounts([{
            id: 1,
            type: data.profile.account_type || 'Savings',
            number: data.profile.account_number,
            balance: parseFloat(data.profile.balance || '0'),
            ifsc: data.profile.ifsc_code,
            branch: data.profile.branch_name
          }]);
        }
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeposit = () => {
    setShowDepositForm(true);
  };

  const handleDepositSubmit = async () => {
    const amount = parseFloat(depositAmount);
    
    if (!depositAmount || amount <= 0) {
      alert('Please enter an amount greater than 0');
      return;
    }
    
    try {
      const userId = localStorage.getItem('user_id');
      const response = await fetch('http://localhost:5000/api/deposit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          amount: amount
        })
      });
      
      const data = await response.json();
      if (data.success) {
        // Update local balance
        setAccounts(prev => prev.map(account => ({
          ...account,
          balance: account.balance + amount
        })));
        setShowDepositForm(false);
        setDepositAmount('');
      }
    } catch (error) {
      console.error('Error depositing money:', error);
    }
  };

  if (!kycCompleted) {
    return (
      <div className="accounts-page">
        <div className="kyc-required">
          <div className="requirement-card">
            <div className="requirement-icon">🔒</div>
            <h3>KYC Verification Required</h3>
            <p>Please complete KYC verification to access account management feature.</p>
            <button onClick={() => onNavigateToKyc && onNavigateToKyc()} className="complete-profile-btn">
              Complete KYC Now
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="feature-container">
        <h2>Account Management</h2>
        <div className="loading">Loading accounts...</div>
      </div>
    );
  }

  return (
    <div className="accounts-page">
      <h2>Account Management</h2>
      <div className="accounts-list">
        {accounts.length === 0 ? (
          <div className="no-data">
            {profile?.kyc_status === 'verified' ? 
              'No accounts found. Create your first account!' : 
              'Complete KYC verification to create accounts'
            }
          </div>
        ) : (
          accounts.map(account => (
            <div key={account.id} className="account-card">
              <div className="account-header">
                <h3>{account.type} Account</h3>
                <div className="account-balance">₹{account.balance.toFixed(2)}</div>
              </div>
              
              <div className="account-details">
                <div className="detail-item">
                  <span className="detail-label">Account Number</span>
                  <span className="detail-value">{account.number}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">IFSC Code</span>
                  <span className="detail-value">BSAI0001234</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Branch Name</span>
                  <span className="detail-value">BankSecure Main Branch</span>
                </div>
              </div>
              
              <div className="account-actions">
                <button className="action-btn view-btn">View Details</button>
                <button className="action-btn deposit-btn" onClick={handleDeposit}>Deposit</button>
                <button className="action-btn download-btn">Download Statement</button>
              </div>
            </div>
          ))
        )}
      </div>
      {showDepositForm && (
        <div className="deposit-form-overlay">
          <div className="deposit-form">
            <button 
              className="close-btn" 
              onClick={() => setShowDepositForm(false)}
            >
              ×
            </button>
            <h3>Deposit Money</h3>
            <input
              type="number"
              placeholder="Enter amount"
              value={depositAmount}
              onChange={(e) => setDepositAmount(e.target.value)}
              className="deposit-input"
            />
            <button 
              className="deposit-submit-btn"
              onClick={handleDepositSubmit}
            >
              Deposit
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountManagement;