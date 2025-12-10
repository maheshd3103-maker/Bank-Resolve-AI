import React, { useState, useEffect } from 'react';

const LoanApplication = ({ kycCompleted, showKycRequired }) => {
  const [loanData, setLoanData] = useState({
    loanType: '',
    amount: '',
    term: '',
    purpose: ''
  });

  const [existingLoans, setExistingLoans] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

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
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!profile?.account_number) {
      alert('Bank account required for loan applications. Please create an account first.');
      return;
    }
    
    console.log('Loan Application:', loanData);
    alert('Loan application submitted successfully! You will be notified about the status.');
  };

  if (!kycCompleted) {
    return showKycRequired();
  }

  if (loading) {
    return (
      <div className="feature-container">
        <h2>Loan Management</h2>
        <div className="loading">Loading loan information...</div>
      </div>
    );
  }

  return (
    <div className="feature-container">
      <h2>Loan Management</h2>
      
      <div className="loans-section">
        <h3>Existing Loans</h3>
        <div className="loans-grid">
          {existingLoans.length === 0 ? (
            <div className="no-data">No loans found</div>
          ) : (
            existingLoans.map(loan => (
              <div key={loan.id} className="loan-card">
                <h4>{loan.type}</h4>
                <div className="loan-amount">{loan.amount}</div>
                <div className="loan-details">
                  <span>Rate: {loan.rate}</span>
                  <span className={`status ${loan.status.toLowerCase()}`}>{loan.status}</span>
                </div>
                <button>View Details</button>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="loan-application">
        <h3>Apply for New Loan</h3>
        {!profile?.account_number && (
          <div className="kyc-required">
            <h3>⚠️ Bank Account Required</h3>
            <p>You need an active bank account to apply for loans. Please create an account first.</p>
            <button onClick={() => window.location.reload()}>Refresh Page</button>
          </div>
        )}
        <form onSubmit={handleSubmit} className="loan-form" style={{opacity: profile?.account_number ? 1 : 0.5}}>
          <div className="form-row">
            <div className="form-group">
              <label>Loan Type</label>
              <select value={loanData.loanType} onChange={(e) => setLoanData({...loanData, loanType: e.target.value})}>
                <option value="">Select Loan Type</option>
                <option value="personal">Personal Loan</option>
                <option value="home">Home Loan</option>
                <option value="car">Car Loan</option>
                <option value="business">Business Loan</option>
              </select>
            </div>
            <div className="form-group">
              <label>Loan Amount</label>
              <input 
                type="number" 
                placeholder="Enter amount"
                value={loanData.amount}
                onChange={(e) => setLoanData({...loanData, amount: e.target.value})}
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Term (months)</label>
              <select value={loanData.term} onChange={(e) => setLoanData({...loanData, term: e.target.value})}>
                <option value="">Select Term</option>
                <option value="12">12 months</option>
                <option value="24">24 months</option>
                <option value="36">36 months</option>
                <option value="60">60 months</option>
              </select>
            </div>
            <div className="form-group">
              <label>Purpose</label>
              <input 
                type="text" 
                placeholder="Loan purpose"
                value={loanData.purpose}
                onChange={(e) => setLoanData({...loanData, purpose: e.target.value})}
              />
            </div>
          </div>
          <button type="submit" className="apply-btn">Apply for Loan</button>
        </form>
      </div>
    </div>
  );
};

export default LoanApplication;