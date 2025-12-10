import React, { useState, useEffect } from 'react';
import AccountManagement from './AccountManagement';
import Transfer from './Transfer';
import TransactionHistory from './TransactionHistory';
import LoanApplication from './LoanApplication';
import KYCVerification from './KYCVerification';
import AIAssistant from './AIAssistant';
import OnboardingSteps from './OnboardingSteps';
import Profile from './Profile';
import KYCStatus from './KYCStatus';
import Complaint from './Complaint';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [kycCompleted, setKycCompleted] = useState(false);
  const [profileCompleted, setProfileCompleted] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [accountInfo, setAccountInfo] = useState(null);
  const [showJourneyFlow, setShowJourneyFlow] = useState(false);
  const [user] = useState({ 
    name: localStorage.getItem('user_name') || 'User', 
    balance: '$25,847.32' 
  });
  
  useEffect(() => {
    checkUserStatus();
  }, []);
  
  const checkUserStatus = async () => {
    try {
      const userId = localStorage.getItem('user_id');
      const response = await fetch(`http://localhost:5000/api/profile/${userId}`);
      const data = await response.json();
      
      if (data.success) {
        // Check if all required profile fields are completed
        const profile = data.profile;
        const requiredFields = [
          'full_name', 'date_of_birth', 'gender', 'mobile_number', 'occupation',
          'father_mother_name', 'marital_status', 'permanent_address', 'present_address',
          'pin_code', 'city', 'state', 'country', 'aadhaar_number', 'pan_number'
        ];
        const isProfileComplete = requiredFields.every(field => 
          profile[field] && profile[field].toString().trim() !== ''
        );
        
        setProfileCompleted(isProfileComplete);
        
        // Check KYC status
        const kycResponse = await fetch(`http://localhost:5000/api/kyc-status/${userId}`);
        const kycData = await kycResponse.json();
        
        if (kycData.success) {
          const isKycVerified = kycData.kyc_status === 'verified';
          setKycCompleted(isKycVerified);
          setAccountInfo(kycData.account_info);
        }
      }
    } catch (error) {
      console.error('Error checking user status:', error);
    }
  };
  
  console.log('Dashboard user_name from localStorage:', localStorage.getItem('user_name'));
  console.log('KYC Status:', kycCompleted);

  const handleTabClick = (tab) => {
    if (!profileCompleted && tab !== 'profile' && tab !== 'overview' && tab !== 'ai') {
      // Redirect to profile for banking features
      setActiveTab('profile');
      return;
    }
    setActiveTab(tab);
  };

  const showProfileRequired = () => {
    return (
      <div className="profile-required">
        <div className="requirement-card">
          <div className="requirement-icon">📋</div>
          <h3>Complete Your Profile First</h3>
          <p>Please fill in all required profile information before accessing other banking features.</p>
          <div className="required-fields">
            <h4>Required Information:</h4>
            <ul>
              <li>📅 Date of Birth</li>
              <li>📱 Mobile Number</li>
              <li>🏠 Permanent Address</li>
              <li>🆔 Aadhaar Number</li>
              <li>💳 PAN Number</li>
            </ul>
          </div>
          <button onClick={() => setActiveTab('profile')} className="complete-profile-btn">
            Complete Profile Now
          </button>
        </div>
      </div>
    );
  };

  const showKycRequired = () => {
    return (
      <div className="kyc-required">
        <h3>KYC Verification Required</h3>
        <p>Please complete KYC verification to access this feature.</p>
        <button onClick={() => setActiveTab('kyc')}>Complete KYC Now</button>
      </div>
    );
  };

  const renderContent = () => {
    switch(activeTab) {
      case 'profile': return <Profile onProfileUpdate={checkUserStatus} />;
      case 'accounts': 
        return !profileCompleted ? showProfileRequired() : <AccountManagement kycCompleted={kycCompleted} showKycRequired={showKycRequired} />;
      case 'transfer': 
        return !profileCompleted ? showProfileRequired() : <Transfer />;
      case 'transactions': 
        return !profileCompleted ? showProfileRequired() : <TransactionHistory />;
      case 'loans': 
        return !profileCompleted ? showProfileRequired() : <LoanApplication kycCompleted={kycCompleted} showKycRequired={showKycRequired} />;
      case 'kyc': 
        return !profileCompleted ? showProfileRequired() : <KYCVerification setKycCompleted={setKycCompleted} onKycComplete={checkUserStatus} />;
      case 'complaint': return <Complaint />;
      case 'ai': return <AIAssistant />;
      default: return (
        <div className="overview-content">
          <div className="welcome-section">
            <h2>Welcome to BankSecure AI</h2>
            <p>Complete these steps to unlock all banking features</p>
            <div className="journey-icon" onClick={() => setShowJourneyFlow(!showJourneyFlow)}>
              🚀 Start Your Banking Journey
            </div>
          </div>
          
          {showJourneyFlow && (
            <div className="journey-flow">
              <div className="flow-step">
                <div className={`flow-circle ${profileCompleted ? 'completed' : 'active'}`}>
                  <span className="flow-icon">👤</span>
                </div>
                <div className="flow-label">Complete Profile</div>
              </div>
              
              <div className={`flow-arrow ${profileCompleted ? 'completed' : ''}`}>→</div>
              
              <div className="flow-step">
                <div className={`flow-circle ${kycCompleted ? 'completed' : profileCompleted ? 'active' : 'disabled'}`}>
                  <span className="flow-icon">📋</span>
                </div>
                <div className="flow-label">Complete KYC</div>
              </div>
              
              <div className={`flow-arrow ${kycCompleted ? 'completed' : ''}`}>→</div>
              
              <div className="flow-step">
                <div className={`flow-circle ${accountInfo ? 'completed' : kycCompleted ? 'active' : 'disabled'}`}>
                  <span className="flow-icon">🏦</span>
                </div>
                <div className="flow-label">Account Ready</div>
              </div>
              
              <div className={`flow-arrow ${accountInfo ? 'completed' : ''}`}>→</div>
              
              <div className="flow-step">
                <div className={`flow-circle ${accountInfo ? 'active' : 'disabled'}`}>
                  <span className="flow-icon">🎉</span>
                </div>
                <div className="flow-label">Start Banking</div>
              </div>
            </div>
          )}
        </div>
      );
    }
  };



  return (
    <div className="dashboard">
      <nav className="dashboard-nav">
        <div className="nav-brand">
          <h1>BankSecure AI</h1>
          <span>Welcome, {user.name}</span>
        </div>
        <div className="nav-tabs">
          <button className={activeTab === 'overview' ? 'active' : ''} onClick={() => handleTabClick('overview')}>Overview</button>
          <button className={activeTab === 'accounts' ? 'active' : ''} onClick={() => handleTabClick('accounts')}>Accounts</button>
          <button className={activeTab === 'transfer' ? 'active' : ''} onClick={() => handleTabClick('transfer')}>Transfer</button>
          <button className={activeTab === 'transactions' ? 'active' : ''} onClick={() => handleTabClick('transactions')}>History</button>
          <button className={activeTab === 'loans' ? 'active' : ''} onClick={() => handleTabClick('loans')}>Loans</button>
          <button className={activeTab === 'kyc' ? 'active' : ''} onClick={() => handleTabClick('kyc')}>KYC</button>
          <button className={activeTab === 'complaint' ? 'active' : ''} onClick={() => handleTabClick('complaint')}>Raise Complaint</button>
          <button className={activeTab === 'ai' ? 'active' : ''} onClick={() => handleTabClick('ai')}>AI Assistant</button>
          <button className={activeTab === 'profile' ? 'active' : ''} onClick={() => handleTabClick('profile')}>Profile</button>
        </div>
        <div className="user-menu">
          <button className="user-menu-btn" onClick={() => setShowDropdown(!showDropdown)}>
            👤
          </button>
          {showDropdown && (
            <div className="dropdown-menu">
              <button onClick={() => { setActiveTab('profile'); setShowDropdown(false); }}>Profile</button>
              <button onClick={() => {
                localStorage.removeItem('user_id');
                localStorage.removeItem('user_name');
                localStorage.removeItem('user_role');
                window.location.reload();
              }}>Logout</button>
            </div>
          )}
        </div>
      </nav>
      <main className="dashboard-content">
        {renderContent()}
      </main>
      

    </div>
  );
};

export default Dashboard;