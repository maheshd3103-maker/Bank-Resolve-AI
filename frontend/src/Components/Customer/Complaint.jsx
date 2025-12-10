import React, { useState } from 'react';

const Complaint = () => {
  const [complaintData, setComplaintData] = useState({
    category: 'transaction',
    transactionId: '',
    transactionDate: '',
    amount: '',
    receiverAccount: '',
    issueType: '',
    description: '',
    priority: 'high'
  });
  const [aiResponse, setAiResponse] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const userId = localStorage.getItem('user_id');
      const response = await fetch('http://localhost:5000/api/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...complaintData, user_id: userId })
      });
      
      if (response.ok) {
        const result = await response.json();
        setAiResponse(result.ai_response);
        setComplaintData({ 
          category: 'transaction', transactionId: '', transactionDate: '', 
          amount: '', receiverAccount: '', issueType: '', description: '', priority: 'high' 
        });
      }
    } catch (error) {
      alert('Error submitting complaint');
    }
  };

  return (
    <div className="complaint-container">
      <h2>🚨 Raise Transaction Complaint</h2>
      <div className="complaint-info">
        <p>💡 Our AI system will automatically find your transaction and provide instant resolution for most issues. You don't need the transaction ID - just provide the details you remember!</p>
      </div>
      
      <form onSubmit={handleSubmit} className="complaint-form">
        <div className="form-row">
          <div className="form-group">
            <label>Transaction ID *</label>
            <input 
              type="text"
              value={complaintData.transactionId}
              onChange={(e) => setComplaintData({...complaintData, transactionId: e.target.value})}
              placeholder="e.g., TXN123456"
              required
            />
            <small>Enter the transaction ID from your transaction history</small>
          </div>
          
          <div className="form-group">
            <label>Transaction Date *</label>
            <input 
              type="date"
              value={complaintData.transactionDate}
              onChange={(e) => setComplaintData({...complaintData, transactionDate: e.target.value})}
              required
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Amount (₹) *</label>
            <input 
              type="number"
              value={complaintData.amount}
              onChange={(e) => setComplaintData({...complaintData, amount: e.target.value})}
              placeholder="500"
              required
            />
          </div>
          
          <div className="form-group">
            <label>Receiver Account/UPI ID *</label>
            <input 
              type="text"
              value={complaintData.receiverAccount}
              onChange={(e) => setComplaintData({...complaintData, receiverAccount: e.target.value})}
              placeholder="9876543210 or user@paytm"
              required
            />
          </div>
        </div>
        
        <div className="form-group">
          <label>Issue Type *</label>
          <select 
            value={complaintData.issueType}
            onChange={(e) => setComplaintData({...complaintData, issueType: e.target.value})}
            required
          >
            <option value="">Select Issue Type</option>
            <option value="money_debited_not_credited">Money debited but not credited to receiver</option>
            <option value="transaction_failed">Transaction failed but money deducted</option>
            <option value="duplicate_transaction">Duplicate/multiple transactions</option>
            <option value="wrong_amount">Wrong amount debited</option>
            <option value="unauthorized_transaction">Unauthorized/fraud transaction</option>
            <option value="refund_not_received">Refund not received</option>
            <option value="other">Other transaction issue</option>
          </select>
        </div>
        

        
        <div className="form-group">
          <label>Detailed Description *</label>
          <textarea 
            value={complaintData.description}
            onChange={(e) => setComplaintData({...complaintData, description: e.target.value})}
            placeholder="Please provide detailed information about what happened. Include any error messages you received."
            rows="4"
            required
          />
          <small>💡 Priority will be automatically determined by our AI based on issue type and amount</small>
        </div>
        
        <div className="complaint-actions">
          <button type="submit" className="submit-btn">
            🤖 Submit for AI Analysis
          </button>
        </div>
      </form>
      
      {aiResponse && (
        <div className="ai-response">
          <h3>🤖 AI Processing Update</h3>
          <div className="response-card">
            <p><strong>Complaint ID:</strong> {aiResponse.complaint_id}</p>
            <p><strong>Status:</strong> {aiResponse.status}</p>
            <p><strong>Estimated Resolution:</strong> {aiResponse.estimated_resolution}</p>
            <div className="next-steps">
              <h4>Next Steps:</h4>
              <ul>
                {aiResponse.next_steps.map((step, index) => (
                  <li key={index}>⏳ {step}</li>
                ))}
              </ul>
            </div>
            <p className="update-note">💬 You'll receive SMS/email updates on your complaint progress</p>
          </div>
        </div>
      )}
      
      <div className="complaint-help">
        <h3>🔍 How our AI helps:</h3>
        <ul>
          <li>✅ Instant transaction verification</li>
          <li>✅ Automatic refund processing for eligible cases</li>
          <li>✅ Real-time fraud detection</li>
          <li>✅ Smart escalation to human agents when needed</li>
        </ul>
      </div>
    </div>
  );
};

export default Complaint;