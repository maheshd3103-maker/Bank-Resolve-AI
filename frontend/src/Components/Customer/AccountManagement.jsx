import React, { useState, useEffect } from 'react';

const AccountManagement = ({ kycCompleted, showKycRequired }) => {
  const [accounts, setAccounts] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [depositAmount, setDepositAmount] = useState('');
  const [isDepositing, setIsDepositing] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);

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
        setAccounts(prev => prev.map(account => ({
          ...account,
          balance: data.new_balance
        })));
        setDepositAmount('');
        setShowDepositModal(false);
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

  if (!kycCompleted) {
    return showKycRequired();
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
              
              {showDepositModal ? (
                <div className="deposit-section">
                  <h4>Deposit Amount</h4>
                  <div className="deposit-input">
                    <input
                      type="number"
                      placeholder="Enter amount"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      disabled={isDepositing}
                    />
                    <div className="deposit-actions">
                      <button 
                        className="cancel-btn" 
                        onClick={() => setShowDepositModal(false)}
                      >
                        Cancel
                      </button>
                      <button 
                        className="deposit-btn" 
                        onClick={handleDeposit}
                        disabled={isDepositing || !depositAmount}
                      >
                        {isDepositing ? 'Processing...' : 'Deposit'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="account-actions">
                  <button onClick={() => setShowDepositModal(true)} className="deposit-amount-btn">Deposit Amount</button>
                  <button>View Details</button>
                  <button>Download Statement</button>
                </div>
              )}
            </div>
          ))
        )}

      </div>
    </div>
  );
};

export default AccountManagement;