import React, { useState, useEffect } from 'react';

const Profile = ({ onProfileUpdate }) => {
  const [profileData, setProfileData] = useState({
    full_name: '',
    date_of_birth: '',
    gender: '',
    mobile_number: '',
    email: '',
    occupation: '',
    father_mother_name: '',
    marital_status: '',
    permanent_address: '',
    present_address: '',
    pin_code: '',
    city: '',
    state: '',
    country: 'India',
    aadhaar_number: '',
    pan_number: '',
    customer_id: '',
    account_number: '',
    ifsc_code: '',
    branch_name: '',
    account_type: '',
    balance: '',
    created_at: '',
    last_login: '',
    kyc_status: 'pending'
  });
  const [isEditing, setIsEditing] = useState(false);
  const [sameAddress, setSameAddress] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState(null);
  
  const isProfileComplete = () => {
    const requiredFields = [
      'full_name', 'date_of_birth', 'gender', 'mobile_number', 'occupation',
      'father_mother_name', 'marital_status', 'permanent_address', 'present_address',
      'pin_code', 'city', 'state', 'country', 'aadhaar_number', 'pan_number'
    ];
    return requiredFields.every(field => profileData[field] && profileData[field].trim() !== '');
  };

  useEffect(() => {
    fetchProfile();
    // Load saved profile photo
    const savedPhoto = localStorage.getItem(`profile_photo_${localStorage.getItem('user_id')}`);
    if (savedPhoto) {
      setProfilePhoto(savedPhoto);
    }
  }, []);

  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    
    // Handle different date formats
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      // Try DD/MM/YYYY format
      const parts = dateString.split('/');
      if (parts.length === 3) {
        const [day, month, year] = parts;
        const formattedDate = new Date(year, month - 1, day);
        if (!isNaN(formattedDate.getTime())) {
          return formattedDate.toISOString().split('T')[0];
        }
      }
      return '';
    }
    
    return date.toISOString().split('T')[0];
  };

  const fetchProfile = async () => {
    try {
      const userId = localStorage.getItem('user_id');
      if (!userId) {
        console.error('No user ID found');
        return;
      }
      const response = await fetch(`http://localhost:5000/api/profile/${userId}`);
      const data = await response.json();
      if (data.success && data.profile) {
        // Format date for HTML input
        const formattedProfile = {
          ...data.profile,
          date_of_birth: formatDateForInput(data.profile.date_of_birth)
        };
        setProfileData(formattedProfile);
        console.log('Profile data loaded:', formattedProfile);
      } else {
        console.error('Failed to fetch profile:', data);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const maskNumber = (number, visibleDigits = 4) => {
    if (!number) return 'Not provided';
    return '*'.repeat(number.length - visibleDigits) + number.slice(-visibleDigits);
  };

  const handleEdit = () => {
    setIsEditing(!isEditing);
  };

  const handleSave = async () => {
    try {
      const userId = localStorage.getItem('user_id');
      const response = await fetch(`http://localhost:5000/api/profile/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData)
      });
      const data = await response.json();
      if (data.success) {
        setIsEditing(false);
        alert('Profile updated successfully!');
        // Notify Dashboard to refresh profile status
        if (onProfileUpdate) {
          onProfileUpdate();
        }
      }
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const handleChange = (e) => {
    setProfileData({ ...profileData, [e.target.name]: e.target.value });
  };

  const handleSameAddressChange = (e) => {
    setSameAddress(e.target.checked);
    if (e.target.checked) {
      setProfileData({ ...profileData, present_address: profileData.permanent_address });
    } else {
      setProfileData({ ...profileData, present_address: '' });
    }
  };

  const handleCreateAccount = async () => {
    try {
      const userId = localStorage.getItem('user_id');
      const response = await fetch('http://localhost:5000/api/create-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, account_type: 'Savings' })
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert(`Bank Account Created Successfully!\n\nAccount Number: ${data.account_number}\nAccount Type: ${data.account_type}\nInitial Balance: ₹${data.initial_balance}\n\nYou can now apply for loans and use all banking services.`);
        fetchProfile();
      } else {
        alert('Error: ' + data.error);
      }
    } catch (error) {
      alert('Error creating account');
    }
  };

  const handleDocumentUpload = async (e, documentType) => {
    const file = e.target.files[0];
    if (!file) return;

    // Handle profile photo separately
    if (documentType === 'profile_photo') {
      const formData = new FormData();
      formData.append('photo', file);
      
      try {
        const userId = localStorage.getItem('user_id');
        const response = await fetch(`http://localhost:5000/api/profile/${userId}/photo`, {
          method: 'POST',
          body: formData
        });
        const data = await response.json();
        
        if (data.success) {
          const reader = new FileReader();
          reader.onload = (e) => {
            setProfilePhoto(e.target.result);
          };
          reader.readAsDataURL(file);
          alert('Profile photo uploaded successfully!');
        } else {
          alert('Error uploading photo: ' + data.error);
        }
      } catch (error) {
        console.error('Error uploading photo:', error);
        alert('Error uploading photo');
      }
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('document_type', documentType);
    formData.append('user_id', localStorage.getItem('user_id'));

    try {
      const response = await fetch('http://localhost:5000/api/extract-document', {
        method: 'POST',
        body: formData
      });
      const data = await response.json();
      
      console.log('Extraction response:', data);
      
      if (data.success) {
        const extractedData = data.extracted_data;
        console.log('Extracted data:', extractedData);
        
        // Update profile data with extracted information
        const updatedData = {
          ...profileData,
          ...(documentType === 'aadhaar' && {
            aadhaar_number: extractedData.aadhaar_number,
            full_name: extractedData.name,
            date_of_birth: extractedData.date_of_birth,
            gender: extractedData.gender,
            permanent_address: extractedData.address
          }),
          ...(documentType === 'pan' && {
            pan_number: extractedData.pan_number,
            full_name: extractedData.name,
            date_of_birth: extractedData.date_of_birth,
            father_mother_name: extractedData.father_name
          })
        };
        
        console.log('Updated profile data:', updatedData);
        setProfileData(updatedData);
        
        alert(`${documentType.toUpperCase()} data extracted successfully!\nAadhaar: ${extractedData.aadhaar_number}\nConfidence: ${data.confidence}`);
        
        // Refresh profile data from server
        setTimeout(() => fetchProfile(), 1000);
      } else {
        console.error('Extraction failed:', data.error);
        alert(`Error extracting ${documentType}: ${data.error}`);
      }
    } catch (error) {
      console.error('Error uploading document:', error);
      alert('Error uploading document');
    }
  };

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h2>👤 My Profile</h2>
        <div className="profile-actions">
          <button onClick={handleEdit} className="edit-btn">
            {isEditing ? 'Cancel' : 'Edit Profile'}
          </button>
          {isEditing && (
            <button 
              onClick={handleSave} 
              className={`save-btn ${!isProfileComplete() ? 'disabled' : ''}`}
              disabled={!isProfileComplete()}
            >
              Save Changes
            </button>
          )}
        </div>
      </div>

      <div className="profile-sections">
        {/* Personal Information */}
        <div className="profile-section">
          <h3>👤 Personal Information</h3>
          <div className="profile-photo-section">
            <div className="profile-photo">
              <img 
                src={profilePhoto || "https://via.placeholder.com/100x100?text=👤"} 
                alt="Profile" 
              />
            </div>
            <div className="photo-upload">
              <input 
                type="file" 
                id="profilePhoto" 
                accept="image/*" 
                style={{display: 'none'}} 
                onChange={(e) => handleDocumentUpload(e, 'profile_photo')} 
              />
              <label htmlFor="profilePhoto" className="upload-btn">
                {profilePhoto ? 'Change Photo' : 'Upload Photo'}
              </label>
            </div>
          </div>
          <div className="profile-grid">
            <div className="profile-field">
              <label>Full Name <span className="required">*</span></label>
              {isEditing ? (
                <input name="full_name" value={profileData.full_name} onChange={handleChange} required />
              ) : (
                <span>{profileData.full_name || 'Not provided'}</span>
              )}
            </div>
            <div className="profile-field">
              <label>Date of Birth <span className="required">*</span></label>
              {isEditing ? (
                <input type="date" name="date_of_birth" value={profileData.date_of_birth} onChange={handleChange} required />
              ) : (
                <span>{profileData.date_of_birth || 'Not provided'}</span>
              )}
            </div>
            <div className="profile-field">
              <label>Gender <span className="required">*</span></label>
              {isEditing ? (
                <select name="gender" value={profileData.gender} onChange={handleChange} required>
                  <option value="">Select</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              ) : (
                <span>{profileData.gender || 'Not provided'}</span>
              )}
            </div>
            <div className="profile-field">
              <label>Mobile Number <span className="required">*</span></label>
              {isEditing ? (
                <input name="mobile_number" value={profileData.mobile_number} onChange={handleChange} required />
              ) : (
                <span>{profileData.mobile_number || 'Not provided'}</span>
              )}
            </div>
            <div className="profile-field">
              <label>Email ID</label>
              <span>{profileData.email || 'Not available'}</span>
            </div>
            <div className="profile-field">
              <label>Occupation <span className="required">*</span></label>
              {isEditing ? (
                <input name="occupation" value={profileData.occupation} onChange={handleChange} required />
              ) : (
                <span>{profileData.occupation || 'Not provided'}</span>
              )}
            </div>
            <div className="profile-field">
              <label>Father's / Mother's Name <span className="required">*</span></label>
              {isEditing ? (
                <input name="father_mother_name" value={profileData.father_mother_name} onChange={handleChange} required />
              ) : (
                <span>{profileData.father_mother_name || 'Not provided'}</span>
              )}
            </div>
            <div className="profile-field">
              <label>Marital Status <span className="required">*</span></label>
              {isEditing ? (
                <select name="marital_status" value={profileData.marital_status} onChange={handleChange} required>
                  <option value="">Select</option>
                  <option value="Single">Single</option>
                  <option value="Married">Married</option>
                  <option value="Divorced">Divorced</option>
                  <option value="Widowed">Widowed</option>
                </select>
              ) : (
                <span>{profileData.marital_status || 'Not provided'}</span>
              )}
            </div>
          </div>
        </div>

        {/* Address Details */}
        <div className="profile-section">
          <h3>📍 Address Details</h3>
          <div className="profile-grid">
            <div className="profile-field full-width">
              <label>Permanent Address <span className="required">*</span></label>
              {isEditing ? (
                <textarea name="permanent_address" value={profileData.permanent_address} onChange={handleChange} required />
              ) : (
                <span>{profileData.permanent_address || 'Not provided'}</span>
              )}
            </div>
            <div className="profile-field full-width">
              <label>Present Address <span className="required">*</span></label>
              {isEditing && (
                <div className="checkbox-container">
                  <input 
                    type="checkbox" 
                    id="sameAddress" 
                    checked={sameAddress} 
                    onChange={handleSameAddressChange} 
                  />
                  <label htmlFor="sameAddress">Same as permanent address</label>
                </div>
              )}
              {isEditing ? (
                <textarea 
                  name="present_address" 
                  value={profileData.present_address} 
                  onChange={handleChange}
                  disabled={sameAddress}
                  required
                />
              ) : (
                <span>{profileData.present_address || 'Not provided'}</span>
              )}
            </div>
            <div className="profile-field">
              <label>PIN Code <span className="required">*</span></label>
              {isEditing ? (
                <input name="pin_code" value={profileData.pin_code} onChange={handleChange} required />
              ) : (
                <span>{profileData.pin_code || 'Not provided'}</span>
              )}
            </div>
            <div className="profile-field">
              <label>City <span className="required">*</span></label>
              {isEditing ? (
                <input name="city" value={profileData.city} onChange={handleChange} required />
              ) : (
                <span>{profileData.city || 'Not provided'}</span>
              )}
            </div>
            <div className="profile-field">
              <label>State <span className="required">*</span></label>
              {isEditing ? (
                <input name="state" value={profileData.state} onChange={handleChange} required />
              ) : (
                <span>{profileData.state || 'Not provided'}</span>
              )}
            </div>
            <div className="profile-field">
              <label>Country <span className="required">*</span></label>
              {isEditing ? (
                <input name="country" value={profileData.country} onChange={handleChange} required />
              ) : (
                <span>{profileData.country || 'Not provided'}</span>
              )}
            </div>
          </div>
        </div>

        {/* Document Information */}
        <div className="profile-section">
          <h3>📄 Document Information</h3>
          <div className="profile-grid">
            <div className="profile-field">
              <label>Aadhaar Number <span className="required">*</span></label>
              {isEditing ? (
                <input 
                  name="aadhaar_number" 
                  value={profileData.aadhaar_number} 
                  onChange={handleChange}
                  placeholder="Enter 12-digit Aadhaar number"
                  maxLength="12"
                  required
                />
              ) : (
                <span>{profileData.aadhaar_number || 'Not provided'}</span>
              )}
            </div>
            <div className="profile-field">
              <label>PAN Number <span className="required">*</span></label>
              {isEditing ? (
                <input 
                  name="pan_number" 
                  value={profileData.pan_number} 
                  onChange={handleChange}
                  placeholder="Enter PAN number (e.g., ABCDE1234F)"
                  maxLength="10"
                  style={{textTransform: 'uppercase'}}
                  required
                />
              ) : (
                <span>{profileData.pan_number || 'Not provided'}</span>
              )}
            </div>
          </div>
        </div>

        {/* Bank Account Information */}
        <div className="profile-section">
          <h3>🏦 Bank Account Information</h3>
          <div className="profile-grid">
            <div className="profile-field">
              <label>Customer ID</label>
              <span>{profileData.customer_id || 'Not assigned'}</span>
            </div>
            <div className="profile-field">
              <label>Account Number</label>
              <span>{maskNumber(profileData.account_number)}</span>
            </div>
            <div className="profile-field">
              <label>IFSC Code</label>
              <span>{profileData.ifsc_code || 'Not provided'}</span>
            </div>
            <div className="profile-field">
              <label>Branch Name</label>
              <span>{profileData.branch_name || 'Not provided'}</span>
            </div>
            <div className="profile-field">
              <label>Account Type</label>
              <span>{profileData.account_type || 'Not provided'}</span>
            </div>
            <div className="profile-field">
              <label>Account Created On</label>
              <span>{profileData.created_at ? new Date(profileData.created_at).toLocaleDateString() : 'Not available'}</span>
            </div>
            <div className="profile-field">
              <label>Current Balance</label>
              <span className="balance">₹{profileData.balance || '0.00'}</span>
            </div>
          </div>
        </div>

        {/* Security & Login */}
        <div className="profile-section">
          <h3>⚙️ Security & Login Information</h3>
          <div className="profile-grid">
            <div className="profile-field">
              <label>Username</label>
              <span>{profileData.email || 'Not available'}</span>
            </div>
            <div className="profile-field">
              <label>Registered Mobile</label>
              <span>{profileData.mobile_number || 'Not provided'}</span>
            </div>
            <div className="profile-field">
              <label>Last Login</label>
              <span>{profileData.last_login ? new Date(profileData.last_login).toLocaleString() : 'Not available'}</span>
            </div>
          </div>
          <div className="security-actions">
            <button className="security-btn">Change Password</button>
            <button className="security-btn">Change MPIN</button>
          </div>
        </div>

        {/* Profile Actions */}
        <div className="profile-section">
          <h3>📝 Profile Actions</h3>
          <div className="action-buttons">
            {profileData.can_create_account && (
              <button className="action-btn primary" onClick={handleCreateAccount}>
                Create Bank Account
              </button>
            )}
            <button className="action-btn primary">Update KYC</button>
            <button className="action-btn">Download Statement</button>
            <button className="action-btn danger" onClick={() => {
              localStorage.clear();
              window.location.reload();
            }}>Logout</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;