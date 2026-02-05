import React, { useState } from 'react';
import './css/complaint.css';

const Complaint = () => {
  const [formData, setFormData] = useState({
    transactionId: '',
    issue: ''
  });
  const [aiResponse, setAiResponse] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const userId = localStorage.getItem('user_id');
      console.log('Submitting complaint:', { transactionId: formData.transactionId, issue: formData.issue, user_id: userId });
      
      const response = await fetch('http://localhost:5000/api/complaint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          user_id: userId
        }),
      });

      const data = await response.json();
      console.log('Complaint response:', data);
      
      if (data.success) {
        // Show success notification with complaint details
        setAiResponse({
          status: data.status,
          message: data.tracking_message,
          complaint_id: data.complaint_id,
          transaction_id: data.transaction_id,
          amount: data.amount,
          tracking_url: data.tracking_url,
          show_tracking_button: data.show_tracking_button
        });
        setFormData({
          transactionId: '',
          issue: ''
        });
        setError(null);
      } else {
        setError(data.message || 'Failed to submit complaint');
      }
    } catch (error) {
      console.error('Error submitting complaint:', error);
      setError('Network error. Please check your connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="complaint-container">
      <h2>🎯 Raise a Complaint</h2>
      
      <div className="complaint-info">
        <p>📞 Our AI agents will process your complaint and provide instant assistance. For urgent matters, we offer 24/7 automated resolution.</p>
      </div>

      {error && (
        <div className="error-message">
          <p>❌ {error}</p>
        </div>
      )}

      <form className="complaint-form" onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Transaction ID *</label>
          <input
            type="text"
            name="transactionId"
            value={formData.transactionId}
            onChange={handleInputChange}
            placeholder="Enter transaction ID"
            required
          />
        </div>

        <div className="form-group">
          <label>Issue Description *</label>
          <textarea
            name="issue"
            value={formData.issue}
            onChange={handleInputChange}
            placeholder="Describe your issue"
            rows="5"
            required
          />
        </div>

        <div className="complaint-actions">
          <button type="submit" className="submit-btn" disabled={isSubmitting}>
            {isSubmitting ? '🔄 Processing...' : '📤 Submit Complaint'}
          </button>
        </div>
      </form>

      {aiResponse && (
        <div className="ai-response">
          <h3>✅ Complaint Submitted Successfully</h3>
          <div className="response-card">
            <p><strong>Complaint ID:</strong> {aiResponse.complaint_id}</p>
            <p><strong>Transaction ID:</strong> {aiResponse.transaction_id}</p>
            <p><strong>Amount:</strong> ₹{aiResponse.amount}</p>
            <p><strong>Status:</strong> {aiResponse.status}</p>
            <p><strong>Message:</strong> {aiResponse.message}</p>
            
            {aiResponse.show_tracking_button && (
              <div className="tracking-section">
                <button 
                  className="track-btn"
                  onClick={() => window.location.href = `/complaints/${aiResponse.complaint_id}/track`}
                >
                  🔍 Track Complaint
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="complaint-help">
        <h3>💡 Common Transaction Issues</h3>
        <ul>
          <li>🔄 Failed Transactions - Payment debited but not credited to recipient</li>
          <li>⏰ Delayed Transactions - Transaction takes longer than expected to reflect</li>
          <li>💰 Double Deductions - Amount debited twice for the same payment</li>
          <li>🤖 AI will analyze your complaint and provide instant resolution</li>
        </ul>
      </div>
    </div>
  );
};

export default Complaint;