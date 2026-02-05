import React, { useState, useEffect } from 'react';

const MoneyTransfer = ({ kycCompleted, showKycRequired }) => {
  const [transferData, setTransferData] = useState({
    fromAccount: '',
    toAccount: '',
    amount: '',
    description: ''
  });
  const [userAccounts, setUserAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (kycCompleted) {
      fetchUserAccounts();
    }
  }, [kycCompleted]);

  const fetchUserAccounts = async () => {
    try {
      const userId = localStorage.getItem('user_id');
      const response = await fetch(`http://localhost:5000/api/profile/${userId}`);
      const data = await response.json();
      
      if (data.success && data.profile.account_number) {
        setUserAccounts([{
          id: data.profile.account_number,
          type: data.profile.account_type || 'Savings',
          number: data.profile.account_number,
          balance: data.profile.balance || 0
        }]);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Transfer:', transferData);
  };

  if (!kycCompleted) {
    return showKycRequired();
  }

  if (loading) {
    return (
      <div className="feature-container">
        <h2>Money Transfer</h2>
        <div className="loading">Loading your accounts...</div>
      </div>
    );
  }

  if (userAccounts.length === 0) {
    return (
      <div className="feature-container">
        <h2>Money Transfer</h2>
        <div className="no-data">
          No accounts available for transfer. Please ensure your account is set up properly.
        </div>
      </div>
    );
  }

  return (
    <div className="feature-container">
      <h2>Money Transfer</h2>
      <div className="transfer-form-container">
        <form onSubmit={handleSubmit} className="transfer-form">
          <div className="form-row">
            <div className="form-group">
              <label>From Account</label>
              <select value={transferData.fromAccount} onChange={(e) => setTransferData({...transferData, fromAccount: e.target.value})}>
                <option value="">Select Account</option>
                {userAccounts.map(account => (
                  <option key={account.id} value={account.id}>
                    {account.type} ****{account.number.slice(-4)} - ₹{account.balance}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>To Account/Email</label>
              <input 
                type="text" 
                placeholder="Account number or email"
                value={transferData.toAccount}
                onChange={(e) => setTransferData({...transferData, toAccount: e.target.value})}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Amount</label>
              <input 
                type="number" 
                placeholder="0.00"
                value={transferData.amount}
                onChange={(e) => setTransferData({...transferData, amount: e.target.value})}
              />
            </div>
            <div className="form-group">
              <label>Description</label>
              <input 
                type="text" 
                placeholder="Payment description"
                value={transferData.description}
                onChange={(e) => setTransferData({...transferData, description: e.target.value})}
              />
            </div>
          </div>
          <button type="submit" className="transfer-btn">Send Money</button>
        </form>
      </div>
    </div>
  );
};

export default MoneyTransfer;