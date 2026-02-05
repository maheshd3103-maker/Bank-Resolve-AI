import React, { useState } from 'react';

const LoanApprovals = () => {
  const [loanApplications, setLoanApplications] = useState([]);

  const handleApproveLoan = (id) => {
    console.log('Approving loan for ID:', id);
  };

  const handleRejectLoan = (id) => {
    console.log('Rejecting loan for ID:', id);
  };

  return (
    <div className="manager-section">
      <h2>Loan Approvals</h2>
      
      <div className="loan-stats">
        <div className="stat-item">
          <span className="stat-label">Pending Applications:</span>
          <span className="stat-value">{loanApplications.length}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Total Amount Pending:</span>
          <span className="stat-value">$0</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Approved This Month:</span>
          <span className="stat-value">0</span>
        </div>
      </div>

      <div className="loan-applications">
        {loanApplications.length === 0 ? (
          <div className="no-data">No loan applications pending</div>
        ) : (
          loanApplications.map(loan => (
          <div key={loan.id} className="loan-card">
            <div className="loan-header">
              <h3>{loan.userName}</h3>
              <span className={`status ${loan.status.toLowerCase().replace(' ', '-')}`}>
                {loan.status}
              </span>
            </div>
            <div className="loan-details">
              <div className="detail-row">
                <span><strong>Loan Type:</strong> {loan.loanType}</span>
                <span><strong>Amount:</strong> {loan.amount}</span>
              </div>
              <div className="detail-row">
                <span><strong>Term:</strong> {loan.term}</span>
                <span><strong>Credit Score:</strong> {loan.creditScore}</span>
              </div>
              <div className="detail-row">
                <span><strong>Applied:</strong> {loan.appliedDate}</span>
              </div>
            </div>
            <div className="loan-actions">
              <button className="view-details-btn">View Full Application</button>
              <button className="approve-btn" onClick={() => handleApproveLoan(loan.id)}>
                Approve
              </button>
              <button className="reject-btn" onClick={() => handleRejectLoan(loan.id)}>
                Reject
              </button>
            </div>
          </div>
          ))
        )}
      </div>
    </div>
  );
};

export default LoanApprovals;