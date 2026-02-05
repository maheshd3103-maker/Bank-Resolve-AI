import React, { useState, useEffect } from 'react';

const OnboardingSteps = ({ setActiveTab, kycCompleted, profileCompleted, onKycStatusChange }) => {
  const [userStatus, setUserStatus] = useState({
    kycCompleted: false,
    accountCreated: false,
    hasAccounts: false
  });
  const [showJourney, setShowJourney] = useState(false);

  useEffect(() => {
    checkUserStatus();
  }, [kycCompleted]);

  const checkUserStatus = async () => {
    try {
      const userId = localStorage.getItem('user_id');
      const response = await fetch(`http://localhost:5000/api/profile/${userId}`);
      const data = await response.json();
      
      if (data.success) {
        const profile = data.profile;
        const isProfileComplete = profile.date_of_birth && profile.mobile_number && 
                                 profile.permanent_address && profile.aadhaar_number && profile.pan_number;
        
        setUserStatus({
          profileCompleted: isProfileComplete,
          kycCompleted: data.profile.kyc_status === 'verified',
          accountCreated: !!data.profile.account_number,
          hasAccounts: !!data.profile.account_number
        });
      }
    } catch (error) {
      console.error('Error checking user status:', error);
    }
  };

  const steps = [
    {
      id: 1,
      title: 'Complete Profile',
      description: 'Fill in your personal details and contact information',
      icon: '👤',
      status: profileCompleted ? 'completed' : 'current',
      action: () => {
        setActiveTab('profile');
        setTimeout(() => checkUserStatus(), 1000);
      },
      buttonText: profileCompleted ? 'Completed ✓' : 'Complete Profile'
    },
    {
      id: 2,
      title: 'Complete KYC Verification',
      description: 'Upload your documents and selfie for identity verification',
      icon: '📋',
      status: profileCompleted ? (userStatus.kycCompleted ? 'completed' : 'current') : 'locked',
      action: () => {
        if (profileCompleted) {
          setActiveTab('kyc');
          setTimeout(() => checkUserStatus(), 1000);
        }
      },
      buttonText: userStatus.kycCompleted ? 'Completed ✓' : 'Complete KYC'
    },
    {
      id: 3,
      title: 'Create Bank Account',
      description: 'Set up your savings or checking account',
      icon: '🏦',
      status: userStatus.kycCompleted ? (userStatus.accountCreated ? 'completed' : 'current') : 'locked',
      action: () => {
        if (userStatus.kycCompleted) {
          setActiveTab('accounts');
          setTimeout(() => checkUserStatus(), 1000);
        }
      },
      buttonText: userStatus.accountCreated ? 'Completed ✓' : 'Create Account'
    },
    {
      id: 4,
      title: 'Start Banking',
      description: 'Transfer money, apply for loans, and use AI features',
      icon: '💰',
      status: userStatus.accountCreated ? 'current' : 'locked',
      action: null,
      buttonText: 'Available'
    }
  ];

  const features = [
    { name: 'Transfer Money', icon: '💸', tab: 'transfer' },
    { name: 'Transaction History', icon: '📊', tab: 'transactions' },
    { name: 'Apply for Loans', icon: '🏦', tab: 'loans' },
    { name: 'AI Assistant', icon: '🤖', tab: 'ai' }
  ];

  return (
    <div className="onboarding-container">
      <div className="welcome-section">
        <h2>Welcome to BankSecure AI</h2>
        <p>Complete these steps to unlock all banking features</p>
        <button 
          className="journey-button"
          onClick={() => setShowJourney(!showJourney)}
        >
          {showJourney ? '📋 Hide Journey' : '🚀 Start Your Banking Journey'}
        </button>
      </div>

      {showJourney && (
        <div className="journey-details">
          <div className="journey-header">
            <h3>🎯 Your Banking Journey</h3>
            <p>Follow these simple steps to get started with BankSecure AI</p>
          </div>
          
          <div className="journey-timeline">
            <div className="timeline-item">
              <div className="timeline-icon">📝</div>
              <div className="timeline-content">
                <h4>Step 1: Complete Your Profile</h4>
                <p>Fill in your personal details and contact information</p>
                <button onClick={() => setActiveTab('profile')} className="timeline-btn">Update Profile</button>
              </div>
            </div>
            
            <div className="timeline-item">
              <div className="timeline-icon">🔐</div>
              <div className="timeline-content">
                <h4>Step 2: KYC Verification</h4>
                <p>Upload your ID documents and complete identity verification</p>
                <button onClick={() => setActiveTab('kyc')} className="timeline-btn">Start KYC</button>
              </div>
            </div>
            
            <div className="timeline-item">
              <div className="timeline-icon">🏦</div>
              <div className="timeline-content">
                <h4>Step 3: Create Bank Account</h4>
                <p>Choose your account type and make initial deposit</p>
                <button 
                  onClick={() => setActiveTab('accounts')} 
                  className="timeline-btn"
                  disabled={!userStatus.kycCompleted}
                >
                  Create Account
                </button>
              </div>
            </div>
            
            <div className="timeline-item">
              <div className="timeline-icon">💰</div>
              <div className="timeline-content">
                <h4>Step 4: Start Banking</h4>
                <p>Transfer money, view transactions, apply for loans</p>
                <div className="feature-buttons">
                  <button onClick={() => setActiveTab('transfer')} disabled={!userStatus.accountCreated}>Transfer</button>
                  <button onClick={() => setActiveTab('loans')} disabled={!userStatus.accountCreated}>Loans</button>
                  <button onClick={() => setActiveTab('ai')}>AI Assistant</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!showJourney && !profileCompleted && (
        <div className="info-banner">
          <div className="banner-icon">ℹ️</div>
          <div className="banner-text">
            <strong>Get Started:</strong> Complete your profile information to unlock KYC verification and banking features.
          </div>
        </div>
      )}
      
      <style jsx>{`
        .journey-button {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          padding: 12px 24px;
          border-radius: 25px;
          font-size: 16px;
          font-weight: 600;
          cursor: pointer;
          margin-top: 15px;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
        }
        
        .journey-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
        }
        
        .journey-details {
          background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
          border-radius: 15px;
          padding: 25px;
          margin: 20px 0;
          box-shadow: 0 8px 25px rgba(0,0,0,0.1);
        }
        
        .journey-header {
          text-align: center;
          margin-bottom: 25px;
        }
        
        .journey-header h3 {
          color: #2c3e50;
          margin-bottom: 8px;
        }
        
        .timeline-item {
          display: flex;
          align-items: flex-start;
          margin-bottom: 25px;
          padding: 20px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 3px 10px rgba(0,0,0,0.1);
        }
        
        .timeline-icon {
          font-size: 24px;
          margin-right: 15px;
          background: #667eea;
          color: white;
          width: 45px;
          height: 45px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .timeline-content h4 {
          color: #2c3e50;
          margin-bottom: 8px;
        }
        
        .timeline-content p {
          color: #7f8c8d;
          margin-bottom: 12px;
        }
        
        .timeline-btn {
          background: #667eea;
          color: white;
          border: none;
          padding: 8px 16px;
          border-radius: 6px;
          cursor: pointer;
          font-weight: 500;
        }
        
        .timeline-btn:hover {
          background: #5a67d8;
        }
        
        .timeline-btn:disabled {
          background: #cbd5e0;
          cursor: not-allowed;
        }
        
        .feature-buttons {
          display: flex;
          gap: 10px;
          flex-wrap: wrap;
        }
        
        .feature-buttons button {
          background: #48bb78;
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
        }
        
        .feature-buttons button:hover {
          background: #38a169;
        }
        
        .feature-buttons button:disabled {
          background: #cbd5e0;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
};

export default OnboardingSteps;