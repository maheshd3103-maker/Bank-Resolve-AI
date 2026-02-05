import React, { useState, useEffect } from 'react';
import './css/complaint-tracking.css';

const ComplaintTracking = () => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchComplaints();
  }, []);

  const fetchComplaints = async () => {
    try {
      const userId = localStorage.getItem('user_id');
      const response = await fetch(`http://localhost:5000/api/complaints/${userId}`);
      const data = await response.json();
      
      if (data.success) {
        setComplaints(data.complaints);
      } else {
        setError(data.error || 'Failed to fetch complaints');
      }
    } catch (error) {
      setError('Network error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'resolved': return '#28a745';
      case 'processing': return '#ffc107';
      case 'escalated': return '#fd7e14';
      case 'submitted': return '#17a2b8';
      default: return '#6c757d';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'resolved': return '✅';
      case 'processing': return '🔄';
      case 'escalated': return '⚠️';
      case 'submitted': return '📝';
      default: return '❓';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'critical': return '#dc3545';
      case 'high': return '#fd7e14';
      case 'medium': return '#ffc107';
      case 'low': return '#28a745';
      default: return '#6c757d';
    }
  };

  if (loading) {
    return (
      <div className="complaint-tracking-container">
        <div className="loading">🔄 Loading complaints...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="complaint-tracking-container">
        <div className="error">❌ {error}</div>
      </div>
    );
  }

  return (
    <div className="complaint-tracking-container">
      <h2>📋 Track Your Complaints</h2>
      
      <div className="complaints-summary">
        <div className="summary-card">
          <div className="summary-number">{complaints.length}</div>
          <div className="summary-label">Total Complaints</div>
        </div>
        <div className="summary-card">
          <div className="summary-number">{complaints.filter(c => c.status === 'resolved').length}</div>
          <div className="summary-label">Resolved</div>
        </div>
        <div className="summary-card">
          <div className="summary-number">{complaints.filter(c => c.status === 'processing').length}</div>
          <div className="summary-label">Processing</div>
        </div>
        <div className="summary-card">
          <div className="summary-number">{complaints.filter(c => c.status === 'escalated').length}</div>
          <div className="summary-label">Escalated</div>
        </div>
      </div>

      {complaints.length === 0 ? (
        <div className="no-complaints">
          <div className="no-complaints-icon">📝</div>
          <h3>No Complaints Found</h3>
          <p>You haven't raised any complaints yet. If you have transaction issues, you can raise a complaint from the "Raise Complaint" tab.</p>
        </div>
      ) : (
        <div className="complaints-list">
          {complaints.map((complaint) => (
            <div key={complaint.id} className="complaint-card">
              <div className="complaint-header">
                <div className="complaint-id">
                  <strong>#{complaint.complaint_id}</strong>
                </div>
                <div className="complaint-status" style={{ color: getStatusColor(complaint.status) }}>
                  {getStatusIcon(complaint.status)} {complaint.status.toUpperCase()}
                </div>
              </div>
              
              <div className="complaint-details">
                <div className="detail-row">
                  <span className="label">Transaction ID:</span>
                  <span className="value">{complaint.transaction_id}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Error Code:</span>
                  <span className="value error-code">{complaint.error_code || 'N/A'}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Amount:</span>
                  <span className="value">₹{complaint.amount || 'N/A'}</span>
                </div>
                <div className="detail-row">
                  <span className="label">Priority:</span>
                  <span className="value priority" style={{ color: getPriorityColor(complaint.priority) }}>
                    {complaint.priority?.toUpperCase() || 'MEDIUM'}
                  </span>
                </div>
                <div className="detail-row">
                  <span className="label">Created:</span>
                  <span className="value">{new Date(complaint.created_at).toLocaleString()}</span>
                </div>
                {complaint.resolved_at && (
                  <div className="detail-row">
                    <span className="label">Resolved:</span>
                    <span className="value">{new Date(complaint.resolved_at).toLocaleString()}</span>
                  </div>
                )}
              </div>
              
              <div className="complaint-description">
                <strong>Issue Description:</strong>
                <p>{complaint.issue_description}</p>
              </div>
              
              {complaint.resolution_notes && (
                <div className="resolution-notes">
                  <strong>Resolution:</strong>
                  <p>{complaint.resolution_notes}</p>
                </div>
              )}
              
              {complaint.refund_transaction_id && (
                <div className="refund-info">
                  <strong>🔄 Refund Transaction ID:</strong> {complaint.refund_transaction_id}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      <div className="refresh-section">
        <button onClick={fetchComplaints} className="refresh-btn">
          🔄 Refresh Complaints
        </button>
      </div>
    </div>
  );
};

export default ComplaintTracking;