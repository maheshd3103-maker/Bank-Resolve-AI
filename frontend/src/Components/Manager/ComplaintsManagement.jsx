import React, { useState, useEffect } from 'react';

const ComplaintsManagement = () => {
  const [complaints, setComplaints] = useState([]);
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [showResolveModal, setShowResolveModal] = useState(false);

  useEffect(() => {
    fetchComplaints();
  }, []);

  const fetchComplaints = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/manager/complaints');
      const data = await response.json();
      if (data.success) {
        setComplaints(data.complaints);
      }
    } catch (error) {
      console.error('Error fetching complaints:', error);
    }
  };

  const handleResolveComplaint = async (resolutionData) => {
    try {
      const response = await fetch(`http://localhost:5000/api/manager/complaints/${selectedComplaint.complaint_id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(resolutionData)
      });
      
      const result = await response.json();
      if (result.success) {
        alert('Complaint resolved successfully!');
        setShowResolveModal(false);
        setSelectedComplaint(null);
        fetchComplaints(); // Refresh list
      } else {
        alert('Error resolving complaint: ' + result.message);
      }
    } catch (error) {
      alert('Network error occurred');
    }
  };

  const getStatusBadge = (status) => {
    const statusColors = {
      'AUTO_PROCESSING': 'bg-blue-500',
      'MANUAL_REVIEW': 'bg-yellow-500',
      'REFUND_INITIATED': 'bg-green-500',
      'resolved': 'bg-gray-500'
    };
    
    return (
      <span className={`px-2 py-1 rounded text-white text-sm ${statusColors[status] || 'bg-gray-400'}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };

  const getPriorityBadge = (priority) => {
    const priorityColors = {
      'CRITICAL': 'bg-red-600',
      'HIGH': 'bg-orange-500',
      'MEDIUM': 'bg-blue-500',
      'LOW': 'bg-gray-500'
    };
    
    return (
      <span className={`px-2 py-1 rounded text-white text-sm ${priorityColors[priority] || 'bg-gray-400'}`}>
        {priority}
      </span>
    );
  };

  return (
    <div className="complaints-management">
      <div className="header">
        <h2>🚨 Complaints Management</h2>
        <div className="stats">
          <div className="stat-card">
            <h3>Total Complaints</h3>
            <p>{complaints.length}</p>
          </div>
          <div className="stat-card">
            <h3>Auto Processing</h3>
            <p>{complaints.filter(c => c.status === 'AUTO_PROCESSING').length}</p>
          </div>
          <div className="stat-card">
            <h3>Manual Review</h3>
            <p>{complaints.filter(c => c.status === 'MANUAL_REVIEW').length}</p>
          </div>
        </div>
      </div>

      <div className="complaints-table">
        <table>
          <thead>
            <tr>
              <th>Complaint ID</th>
              <th>Customer</th>
              <th>Transaction ID</th>
              <th>Amount</th>
              <th>Error Code</th>
              <th>Status</th>
              <th>Priority</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {complaints.map(complaint => (
              <tr key={complaint.complaint_id}>
                <td>{complaint.complaint_id}</td>
                <td>
                  <div>
                    <div>{complaint.full_name}</div>
                    <small>{complaint.email}</small>
                  </div>
                </td>
                <td>{complaint.transaction_id}</td>
                <td>₹{complaint.amount}</td>
                <td>
                  <span className="error-code">{complaint.error_code}</span>
                </td>
                <td>{getStatusBadge(complaint.status)}</td>
                <td>{getPriorityBadge(complaint.priority)}</td>
                <td>{new Date(complaint.created_at).toLocaleDateString()}</td>
                <td>
                  <button 
                    className="view-btn"
                    onClick={() => setSelectedComplaint(complaint)}
                  >
                    View
                  </button>
                  {complaint.status === 'MANUAL_REVIEW' && (
                    <button 
                      className="resolve-btn"
                      onClick={() => {
                        setSelectedComplaint(complaint);
                        setShowResolveModal(true);
                      }}
                    >
                      Resolve
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedComplaint && !showResolveModal && (
        <ComplaintDetailsModal 
          complaint={selectedComplaint}
          onClose={() => setSelectedComplaint(null)}
        />
      )}

      {showResolveModal && selectedComplaint && (
        <ResolveComplaintModal 
          complaint={selectedComplaint}
          onResolve={handleResolveComplaint}
          onClose={() => setShowResolveModal(false)}
        />
      )}
    </div>
  );
};

const ComplaintDetailsModal = ({ complaint, onClose }) => {
  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Complaint Details - {complaint.complaint_id}</h3>
          <button onClick={onClose} className="close-btn">×</button>
        </div>
        
        <div className="complaint-details">
          <div className="detail-section">
            <h4>Customer Information</h4>
            <p><strong>Name:</strong> {complaint.full_name}</p>
            <p><strong>Email:</strong> {complaint.email}</p>
          </div>
          
          <div className="detail-section">
            <h4>Transaction Information</h4>
            <p><strong>Transaction ID:</strong> {complaint.transaction_id}</p>
            <p><strong>Amount:</strong> ₹{complaint.amount}</p>
            <p><strong>Error Code:</strong> {complaint.error_code}</p>
            <p><strong>Receiver Account:</strong> {complaint.receiver_account}</p>
          </div>
          
          <div className="detail-section">
            <h4>Complaint Information</h4>
            <p><strong>Issue Type:</strong> {complaint.issue_type}</p>
            <p><strong>Status:</strong> {complaint.status}</p>
            <p><strong>Priority:</strong> {complaint.priority}</p>
            <p><strong>Root Cause:</strong> {complaint.root_cause}</p>
            <p><strong>Resolution Action:</strong> {complaint.resolution_action}</p>
            <p><strong>Estimated Resolution:</strong> {complaint.estimated_resolution}</p>
          </div>
          
          {complaint.description && (
            <div className="detail-section">
              <h4>Customer Comments</h4>
              <p>{complaint.description}</p>
            </div>
          )}
          
          {complaint.resolution_notes && (
            <div className="detail-section">
              <h4>Resolution Notes</h4>
              <p>{complaint.resolution_notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ResolveComplaintModal = ({ complaint, onResolve, onClose }) => {
  const [resolutionData, setResolutionData] = useState({
    resolution_notes: '',
    refund_amount: complaint.amount
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onResolve(resolutionData);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>Resolve Complaint - {complaint.complaint_id}</h3>
          <button onClick={onClose} className="close-btn">×</button>
        </div>
        
        <form onSubmit={handleSubmit} className="resolve-form">
          <div className="complaint-summary">
            <p><strong>Customer:</strong> {complaint.full_name}</p>
            <p><strong>Transaction:</strong> {complaint.transaction_id}</p>
            <p><strong>Amount:</strong> ₹{complaint.amount}</p>
            <p><strong>Error:</strong> {complaint.error_code} - {complaint.root_cause}</p>
          </div>
          
          <div className="form-group">
            <label>Refund Amount (₹)</label>
            <input 
              type="number"
              value={resolutionData.refund_amount}
              onChange={(e) => setResolutionData({...resolutionData, refund_amount: e.target.value})}
              min="0"
              max={complaint.amount}
            />
            <small>Enter 0 for no refund</small>
          </div>
          
          <div className="form-group">
            <label>Resolution Notes *</label>
            <textarea 
              value={resolutionData.resolution_notes}
              onChange={(e) => setResolutionData({...resolutionData, resolution_notes: e.target.value})}
              placeholder="Explain the resolution and actions taken..."
              rows="4"
              required
            />
          </div>
          
          <div className="form-actions">
            <button type="submit" className="resolve-btn">Resolve Complaint</button>
            <button type="button" onClick={onClose} className="cancel-btn">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ComplaintsManagement;