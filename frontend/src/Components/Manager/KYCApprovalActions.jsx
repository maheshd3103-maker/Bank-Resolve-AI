import React, { useState } from 'react';

const KYCApprovalActions = ({ application, onApprove, onReject }) => {
  const [managerId, setManagerId] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);

  const handleApprove = async (isSecondApproval = false) => {
    if (!managerId.trim()) {
      alert('Manager ID is required for approval');
      return;
    }

    setLoading(true);
    try {
      const endpoint = isSecondApproval ? '/api/manager/kyc-second-approve' : '/api/manager/kyc-approve';
      const response = await fetch(`http://localhost:5000${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kyc_id: application.id,
          manager_id: managerId,
          reason: reason || 'KYC documents verified'
        })
      });

      const data = await response.json();
      if (data.success) {
        alert(data.message);
        onApprove();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!managerId.trim()) {
      alert('Manager ID is required for rejection');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('http://localhost:5000/api/manager/kyc-reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kyc_id: application.id,
          manager_id: managerId,
          reason: reason || 'KYC documents rejected'
        })
      });

      const data = await response.json();
      if (data.success) {
        alert(data.message);
        onReject();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      'pending': { text: 'Pending Review', color: '#ffa500' },
      'first_approved': { text: 'First Approved', color: '#2196f3' },
      'verified': { text: 'Fully Approved', color: '#4caf50' },
      'rejected': { text: 'Rejected', color: '#f44336' }
    };
    
    const badge = badges[status] || badges['pending'];
    return (
      <span style={{ 
        padding: '4px 8px', 
        borderRadius: '4px', 
        backgroundColor: badge.color, 
        color: 'white', 
        fontSize: '12px' 
      }}>
        {badge.text}
      </span>
    );
  };

  return (
    <div style={{ padding: '10px', border: '1px solid #ddd', borderRadius: '5px', margin: '10px 0' }}>
      <div style={{ marginBottom: '10px' }}>
        <strong>Status:</strong> {getStatusBadge(application.status)}
      </div>
      
      <div style={{ marginBottom: '10px' }}>
        <input
          type="text"
          placeholder="Manager ID (required)"
          value={managerId}
          onChange={(e) => setManagerId(e.target.value)}
          style={{ marginRight: '10px', padding: '5px' }}
        />
        <input
          type="text"
          placeholder="Approval/Rejection reason (optional)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          style={{ padding: '5px', width: '200px' }}
        />
      </div>

      <div>
        {application.status === 'pending' && (
          <>
            <button 
              onClick={() => handleApprove(false)}
              disabled={loading}
              style={{ 
                marginRight: '10px', 
                padding: '8px 16px', 
                backgroundColor: '#2196f3', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px' 
              }}
            >
              {loading ? 'Processing...' : 'First Approve'}
            </button>
            <button 
              onClick={handleReject}
              disabled={loading}
              style={{ 
                padding: '8px 16px', 
                backgroundColor: '#f44336', 
                color: 'white', 
                border: 'none', 
                borderRadius: '4px' 
              }}
            >
              {loading ? 'Processing...' : 'Reject'}
            </button>
          </>
        )}
        
        {application.status === 'first_approved' && (
          <button 
            onClick={() => handleApprove(true)}
            disabled={loading}
            style={{ 
              padding: '8px 16px', 
              backgroundColor: '#4caf50', 
              color: 'white', 
              border: 'none', 
              borderRadius: '4px' 
            }}
          >
            {loading ? 'Processing...' : 'Second Approve (Final)'}
          </button>
        )}
        
        {application.status === 'verified' && (
          <div style={{ color: '#4caf50', fontWeight: 'bold' }}>
            ✅ Fully Approved - Customer can create account
          </div>
        )}
        
        {application.status === 'rejected' && (
          <div style={{ color: '#f44336', fontWeight: 'bold' }}>
            ❌ Rejected - Customer must resubmit KYC
          </div>
        )}
      </div>
    </div>
  );
};

export default KYCApprovalActions;