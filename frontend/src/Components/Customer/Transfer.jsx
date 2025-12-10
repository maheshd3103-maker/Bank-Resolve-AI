import React, { useState } from 'react';

const Transfer = () => {
  const [transferData, setTransferData] = useState({
    receiver_name: '',
    receiver_account: '',
    receiver_bank: '',
    amount: '',
    purpose: 'Transfer'
  });
  const [transactionResult, setTransactionResult] = useState(null);
  const [showComplaintForm, setShowComplaintForm] = useState(false);

  const handleTransfer = async (e) => {
    e.preventDefault();
    setTransactionResult({ status: 'PROCESSING', message: 'Processing your transaction...' });
    
    try {
      const userId = localStorage.getItem('user_id');
      const response = await fetch('http://localhost:5000/api/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...transferData, user_id: userId })
      });
      
      const result = await response.json();
      setTransactionResult(result);
      
      if (result.success || result.status === 'SUCCESS') {
        setTransferData({
          receiver_name: '', receiver_account: '', receiver_bank: '', amount: '', purpose: 'Transfer'
        });
      }
    } catch (error) {
      setTransactionResult({ success: false, status: 'FAILED', message: 'Network error occurred' });
    }
  };



  const handleComplaint = async (complaintData) => {
    try {
      const userId = localStorage.getItem('user_id');
      const response = await fetch('http://localhost:5000/api/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          transaction_id: transactionResult.transaction_id,
          issue_type: complaintData.issue_type,
          additional_comments: complaintData.additional_comments
        })
      });
      
      const result = await response.json();
      if (result.success) {
        setTransactionResult({
          ...transactionResult,
          complaint_response: result.ai_response
        });
        setShowComplaintForm(false);
      }
    } catch (error) {
      alert('Error submitting complaint');
    }
  };

  return (
    <div className="transfer-container">
      <h2>💸 Send Money</h2>
      
      {!transactionResult && (
        <form onSubmit={handleTransfer} className="transfer-form">
          <div className="form-group">
            <label>Receiver Name *</label>
            <input 
              type="text"
              value={transferData.receiver_name}
              onChange={(e) => setTransferData({...transferData, receiver_name: e.target.value})}
              placeholder="Enter receiver's full name"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Account Number *</label>
              <input 
                type="text"
                value={transferData.receiver_account}
                onChange={(e) => setTransferData({...transferData, receiver_account: e.target.value})}
                placeholder="1234567890"
                required
              />
            </div>
            
            <div className="form-group">
              <label>Bank Name *</label>
              <select 
                value={transferData.receiver_bank}
                onChange={(e) => setTransferData({...transferData, receiver_bank: e.target.value})}
                required
              >
                <option value="">Select Bank</option>
                <option value="State Bank of India">State Bank of India</option>
                <option value="HDFC Bank">HDFC Bank</option>
                <option value="ICICI Bank">ICICI Bank</option>
                <option value="Axis Bank">Axis Bank</option>
                <option value="Punjab National Bank">Punjab National Bank</option>
              </select>
            </div>
          </div>

          <div className="form-row">
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
              <label>Purpose</label>
              <select 
                value={transferData.purpose}
                onChange={(e) => setTransferData({...transferData, purpose: e.target.value})}
              >
                <option value="Transfer">General Transfer</option>
                <option value="Family Support">Family Support</option>
                <option value="Bill Payment">Bill Payment</option>
                <option value="Business">Business Payment</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
          
          <button type="submit" className="transfer-btn">
            🚀 Send Money
          </button>
        </form>
      )}

      {transactionResult && (
        <div className="transaction-result">
          <div className={`result-card ${transactionResult.success ? 'success' : 'failed'}`}>
            <h3>
              {transactionResult.status === 'SUCCESS' && '✅ Transaction Successful'}
              {transactionResult.status === 'FAILED' && '❌ Transaction Failed'}
              {transactionResult.status === 'PROCESSING' && '⏳ Processing Transaction...'}
              {transactionResult.status === 'PENDING' && '⏳ Transaction Pending'}
            </h3>
            
            {transactionResult.status === 'PROCESSING' && (
              <div className="processing-indicator">
                <div className="spinner"></div>
                <p>Contacting NPCI network...</p>
                <small>This may take 3-5 seconds</small>
              </div>
            )}
            
            <div className="result-details">
              <p><strong>Transaction ID:</strong> {transactionResult.transaction_id}</p>
              <p><strong>Message:</strong> {transactionResult.message}</p>
              
              {transactionResult.error_code && (
                <p><strong>Error Code:</strong> {transactionResult.error_code}</p>
              )}
              
              {transactionResult.new_balance && (
                <p><strong>New Balance:</strong> ₹{transactionResult.new_balance}</p>
              )}
            </div>

            {transactionResult.can_raise_complaint && !showComplaintForm && !transactionResult.complaint_response && (
              <button 
                className="complaint-btn"
                onClick={() => setShowComplaintForm(true)}
              >
                🚨 Raise Complaint
              </button>
            )}

            {showComplaintForm && (
              <ComplaintForm 
                onSubmit={handleComplaint}
                onCancel={() => setShowComplaintForm(false)}
              />
            )}

            {transactionResult.complaint_response && (
              <div className="complaint-response">
                <h4>🤖 AI Complaint Analysis</h4>
                <div className="ai-analysis">
                  <p><strong>Complaint ID:</strong> {transactionResult.complaint_response.complaint_id}</p>
                  <p><strong>Root Cause:</strong> {transactionResult.complaint_response.root_cause}</p>
                  <p><strong>Resolution Action:</strong> {transactionResult.complaint_response.resolution_action}</p>
                  <p><strong>Estimated Resolution:</strong> {transactionResult.complaint_response.estimated_resolution}</p>
                  <p className="ai-message">{transactionResult.complaint_response.message}</p>
                </div>
              </div>
            )}

            <button 
              className="new-transaction-btn"
              onClick={() => {
                setTransactionResult(null);
                setShowComplaintForm(false);
              }}
            >
              💸 New Transaction
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const ComplaintForm = ({ onSubmit, onCancel }) => {
  const [complaintData, setComplaintData] = useState({
    issue_type: '',
    additional_comments: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(complaintData);
  };

  return (
    <div className="complaint-form-overlay">
      <form onSubmit={handleSubmit} className="complaint-form">
        <h4>🚨 Raise Complaint</h4>
        
        <div className="form-group">
          <label>Issue Type *</label>
          <select 
            value={complaintData.issue_type}
            onChange={(e) => setComplaintData({...complaintData, issue_type: e.target.value})}
            required
          >
            <option value="">Select Issue</option>
            <option value="failed_transaction">Transaction Failed</option>
            <option value="money_debited_not_credited">Money Debited but Not Credited</option>
            <option value="duplicate_transaction">Duplicate Transaction</option>
            <option value="wrong_amount">Wrong Amount Debited</option>
            <option value="other">Other Issue</option>
          </select>
        </div>
        
        <div className="form-group">
          <label>Additional Comments</label>
          <textarea 
            value={complaintData.additional_comments}
            onChange={(e) => setComplaintData({...complaintData, additional_comments: e.target.value})}
            placeholder="Describe what happened..."
            rows="3"
          />
        </div>
        
        <div className="form-actions">
          <button type="submit" className="submit-btn">Submit Complaint</button>
          <button type="button" onClick={onCancel} className="cancel-btn">Cancel</button>
        </div>
      </form>
    </div>
  );
};

export default Transfer;