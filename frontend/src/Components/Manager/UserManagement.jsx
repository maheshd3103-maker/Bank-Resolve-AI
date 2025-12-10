import React, { useState } from 'react';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isActive, setIsActive] = useState(true);

  const fetchCustomers = async () => {
    try {
      console.log('Fetching customers from API...');
      const response = await fetch('http://localhost:5000/api/manager/users');
      const data = await response.json();
      console.log('API Response:', data);
      console.log('Customers array:', data.customers);
      if (data.success) {
        setUsers(data.users || []);
        setTotalCustomers(data.users ? data.users.length : 0);
        console.log('Users state updated:', data.customers);
        console.log('Total customers set to:', data.total_count);
      } else {
        console.error('API Error:', data.error);
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  React.useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchUserDetails = async (userId) => {
    try {
      const response = await fetch(`http://localhost:5000/api/manager/user/${userId}`);
      const data = await response.json();
      if (data.success) {
        setSelectedUser(data);
        setShowModal(true);
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
    }
  };

  const filteredUsers = users.filter(user => 
    user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="manager-section">
      <h2>User Management</h2>
      
      <div className="search-controls">
        <input 
          type="text"
          placeholder="Search users by name or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="users-table">
        <div className="table-header">
          <span>Name</span>
          <span>Email</span>
          <span>Status</span>
          <span>KYC Status</span>
          <span>Join Date</span>
          <span>Actions</span>
        </div>
        {filteredUsers.length === 0 ? (
          <div className="no-data-row">No customers found (Total: {totalCustomers})</div>
        ) : (
          filteredUsers.map(user => (
            <div key={user.id} className="table-row">
              <span>{user.full_name}</span>
              <span>{user.email}</span>
              <span className={`status ${user.is_active ? 'active' : 'inactive'}`}>{user.is_active ? 'Active' : 'Inactive'}</span>
              <span className={`kyc-status ${user.kyc_status || 'not_submitted'}`}>
                {user.kyc_status === 'verified' ? 'Verified' : 
                 user.kyc_status === 'pending' ? 'Pending' : 
                 user.kyc_status === 'rejected' ? 'Rejected' : 'Not Submitted'}
              </span>
              <span>{new Date(user.created_at).toLocaleDateString()}</span>
              <div className="actions">
                <button className="view-btn" onClick={() => fetchUserDetails(user.id)}>View</button>
                <button className="edit-btn">Edit</button>
                <button className="suspend-btn">Suspend</button>
              </div>
            </div>
          ))
        )}
      </div>
      
      {showModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="user-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>User Details</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>×</button>
            </div>
            <div className="modal-content">
              <div className="user-info-section">
                <h4>Basic Information</h4>
                <div className="info-grid">
                  <div><strong>Name:</strong> {selectedUser.user?.full_name}</div>
                  <div><strong>Email:</strong> {selectedUser.user?.email}</div>
                  <div><strong>Role:</strong> {selectedUser.user?.role || 'Customer'}</div>
                  <div><strong>Joined:</strong> {new Date(selectedUser.user?.created_at).toLocaleDateString()}</div>
                </div>
              </div>
              
              {selectedUser.profile && (
                <div className="user-info-section">
                  <h4>Profile Information</h4>
                  <div className="info-grid">
                    <div><strong>Mobile:</strong> {selectedUser.profile.mobile_number || 'Not provided'}</div>
                    <div><strong>DOB:</strong> {selectedUser.profile.date_of_birth || 'Not provided'}</div>
                    <div><strong>Gender:</strong> {selectedUser.profile.gender || 'Not provided'}</div>
                    <div><strong>Occupation:</strong> {selectedUser.profile.occupation || 'Not provided'}</div>
                    <div><strong>Address:</strong> {selectedUser.profile.permanent_address || 'Not provided'}</div>
                    <div><strong>City:</strong> {selectedUser.profile.city || 'Not provided'}</div>
                    <div><strong>Aadhaar:</strong> {selectedUser.profile.aadhaar_number || 'Not provided'}</div>
                    <div><strong>PAN:</strong> {selectedUser.profile.pan_number || 'Not provided'}</div>
                  </div>
                </div>
              )}
              
              {selectedUser.account && (
                <div className="user-info-section">
                  <h4>Banking Details</h4>
                  <div className="info-grid">
                    <div><strong>Account Number:</strong> {selectedUser.account.account_number}</div>
                    <div><strong>Account Type:</strong> {selectedUser.account.account_type}</div>
                    <div><strong>Current Balance:</strong> ₹{parseFloat(selectedUser.account.balance || 0).toFixed(2)}</div>
                    <div><strong>IFSC Code:</strong> {selectedUser.account.ifsc_code}</div>
                    <div><strong>Branch Name:</strong> {selectedUser.account.branch_name}</div>
                    <div><strong>Account Status:</strong> <span className="status active">Active</span></div>
                    <div><strong>Account Created:</strong> {new Date(selectedUser.account.created_at).toLocaleDateString()}</div>
                  </div>
                </div>
              )}
              
              {!selectedUser.account && selectedUser.kyc && selectedUser.kyc.verification_status === 'verified' && (
                <div className="user-info-section">
                  <h4>Banking Details</h4>
                  <div className="info-grid">
                    <div className="no-account-message">Account creation in progress...</div>
                  </div>
                </div>
              )}
              
              {!selectedUser.account && (!selectedUser.kyc || selectedUser.kyc.verification_status !== 'verified') && (
                <div className="user-info-section">
                  <h4>Banking Details</h4>
                  <div className="info-grid">
                    <div className="no-account-message">No banking account - KYC verification required</div>
                  </div>
                </div>
              )}
              
              {selectedUser.kyc && (
                <div className="user-info-section">
                  <h4>KYC Information</h4>
                  <div className="info-grid">
                    <div><strong>Status:</strong> 
                      <span className={`kyc-status ${selectedUser.kyc.verification_status}`}>
                        {selectedUser.kyc.verification_status}
                      </span>
                    </div>
                    <div><strong>Submitted:</strong> {new Date(selectedUser.kyc.created_at).toLocaleDateString()}</div>
                    {selectedUser.kyc.verified_at && (
                      <div><strong>Verified:</strong> {new Date(selectedUser.kyc.verified_at).toLocaleDateString()}</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;