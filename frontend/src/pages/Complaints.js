import React, { useState, useEffect } from 'react';
import { AlertTriangle, Plus, Eye, Clock, CheckCircle, XCircle } from 'lucide-react';
import { complaintAPI, transactionAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import '../styles/Complaints.css';

const Complaints = () => {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    transactionId: '',
    issue: '',
  });

  useEffect(() => {
    loadData();
  }, [user?.id]);

  const loadData = async () => {
    if (!user?.id) return;
    try {
      const [complaintsRes, transactionsRes] = await Promise.all([
        complaintAPI.getUserComplaints(user.id),
        transactionAPI.getTransactions(user.id),
      ]);

      if (complaintsRes.data.success) {
        setComplaints(complaintsRes.data.complaints);
      }

      if (transactionsRes.data.success) {
        // Only show failed transactions
        setTransactions(transactionsRes.data.transactions.filter(t => t.status === 'failed'));
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await complaintAPI.submitComplaint({
        user_id: user.id,
        transactionId: formData.transactionId,
        issue: formData.issue,
      });

      if (response.data.success) {
        setShowModal(false);
        setFormData({ transactionId: '', issue: '' });
        loadData();
        alert('Complaint submitted successfully!');
      }
    } catch (error) {
      alert('Error submitting complaint: ' + error.message);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'resolved': return <CheckCircle size={18} className="status-icon success" />;
      case 'processing': return <Clock size={18} className="status-icon warning" />;
      case 'escalated': return <AlertTriangle size={18} className="status-icon warning" />;
      default: return <XCircle size={18} className="status-icon error" />;
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'resolved': return 'badge-success';
      case 'processing': return 'badge-warning';
      case 'escalated': return 'badge-warning';
      default: return 'badge-error';
    }
  };

  return (
    <>
      <Navbar />
      <div className="complaints-container">
        <div className="complaints-content">
          <div className="complaints-header">
            <div>
              <h1 className="page-title">Complaint Management</h1>
              <p className="page-subtitle">Track and resolve your transaction issues</p>
            </div>
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              <Plus size={18} />
              New Complaint
            </button>
          </div>

          {/* Stats Cards */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#fef3c7' }}>
                <Clock size={24} style={{ color: '#f59e0b' }} />
              </div>
              <div className="stat-info">
                <p className="stat-value">{complaints.filter(c => c.status === 'processing').length}</p>
                <p className="stat-label">Processing</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#d1fae5' }}>
                <CheckCircle size={24} style={{ color: '#10b981' }} />
              </div>
              <div className="stat-info">
                <p className="stat-value">{complaints.filter(c => c.status === 'resolved').length}</p>
                <p className="stat-label">Resolved</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon" style={{ background: '#dbeafe' }}>
                <AlertTriangle size={24} style={{ color: '#3b82f6' }} />
              </div>
              <div className="stat-info">
                <p className="stat-value">{complaints.length}</p>
                <p className="stat-label">Total Complaints</p>
              </div>
            </div>
          </div>

          {/* Complaints List */}
          <div className="card">
            <h2 className="section-title">Your Complaints</h2>
            {loading ? (
              <div className="loading-container">
                <div className="spinner"></div>
              </div>
            ) : complaints.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🎉</div>
                <p>No complaints found</p>
                <p className="empty-subtitle">Great! You haven't filed any complaints yet.</p>
              </div>
            ) : (
              <div className="complaints-list">
                {complaints.map((complaint, index) => (
                  <div key={index} className="complaint-card">
                    <div className="complaint-header-row">
                      <div>
                        <h3 className="complaint-id">{complaint.complaint_id}</h3>
                        <p className="complaint-date">
                          {new Date(complaint.created_at).toLocaleDateString('en-US', {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                      <div className="complaint-status-badge">
                        {getStatusIcon(complaint.status)}
                        <span className={`badge ${getStatusClass(complaint.status)}`}>
                          {complaint.status}
                        </span>
                      </div>
                    </div>
                    <div className="complaint-body">
                      <div className="complaint-detail">
                        <span className="detail-label">Transaction ID:</span>
                        <span className="detail-value">{complaint.transaction_id}</span>
                      </div>
                      <div className="complaint-detail">
                        <span className="detail-label">Issue:</span>
                        <span className="detail-value">{complaint.issue_description}</span>
                      </div>
                      <div className="complaint-detail">
                        <span className="detail-label">Amount:</span>
                        <span className="detail-value amount-value">
                          ${parseFloat(complaint.amount || 0).toFixed(2)}
                        </span>
                      </div>
                      {complaint.resolution_notes && (
                        <div className="complaint-resolution">
                          <strong>Resolution:</strong> {complaint.resolution_notes}
                        </div>
                      )}
                    </div>
                    <div className="complaint-footer">
                      <span className={`priority-badge priority-${complaint.priority}`}>
                        {complaint.priority} priority
                      </span>
                      {complaint.error_code && (
                        <span className="error-code">Error: {complaint.error_code}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Complaint Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>File New Complaint</h2>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSubmit} className="complaint-form">
              <div className="form-group">
                <label className="form-label">Select Transaction</label>
                <select
                  name="transactionId"
                  value={formData.transactionId}
                  onChange={(e) => setFormData({ ...formData, transactionId: e.target.value })}
                  required
                  className="input-field"
                >
                  <option value="">Choose a failed transaction</option>
                  {transactions.map((txn, idx) => (
                    <option key={idx} value={txn.transaction_id}>
                      {txn.transaction_id} - ${parseFloat(txn.amount).toFixed(2)} - {txn.description}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Describe Your Issue</label>
                <textarea
                  name="issue"
                  value={formData.issue}
                  onChange={(e) => setFormData({ ...formData, issue: e.target.value })}
                  placeholder="Please provide details about your issue..."
                  required
                  rows="4"
                  className="input-field"
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Submit Complaint
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default Complaints;

