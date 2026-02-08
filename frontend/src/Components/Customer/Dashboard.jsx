import React, { useState, useEffect } from 'react';
import './css/complaints-display.css';
import AccountManagement from './AccountManagement';
import Transfer from './Transfer';
import TransactionHistory from './TransactionHistory';
import KYCVerification from './KYCVerification';
import AIAssistant from './AIAssistant';
import Profile from './Profile';
import Complaint from './Complaint';
import ComplaintTracking from './ComplaintTracking';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [kycCompleted, setKycCompleted] = useState(false);
  const [profileCompleted, setProfileCompleted] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showComplaintsDropdown, setShowComplaintsDropdown] = useState(false);
  const [accountInfo, setAccountInfo] = useState(null);
  const [showJourneyFlow, setShowJourneyFlow] = useState(false);
  const [showComplaints, setShowComplaints] = useState(false);
  const [user] = useState({ 
    name: localStorage.getItem('user_name') || 'User', 
    balance: '$25,847.32' 
  });
  const [transactions, setTransactions] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  
  const navigateToKyc = () => {
    setActiveTab('kyc');
  };
  
  useEffect(() => {
    checkUserStatus();
    fetchTransactionsForCharts();
  }, []);

  const fetchTransactionsForCharts = async () => {
    try {
      const userId = localStorage.getItem('user_id');
      if (!userId) return;
      
      const response = await fetch(`http://localhost:5000/api/transactions/${userId}`);
      const data = await response.json();
      
      if (data.success && data.transactions) {
        setTransactions(data.transactions);
        
        // Prepare data for balance trend chart (last 7 days)
        const last7Days = [];
        const today = new Date();
        for (let i = 6; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          
          const dayTransactions = data.transactions.filter(t => {
            const txnDate = new Date(t.created_at).toISOString().split('T')[0];
            return txnDate === dateStr;
          });
          
          let balance = parseFloat(data.transactions[0]?.balance_after || 0);
          if (dayTransactions.length > 0) {
            balance = parseFloat(dayTransactions[dayTransactions.length - 1].balance_after || 0);
          }
          
          last7Days.push({
            date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            balance: balance,
            transactions: dayTransactions.length
          });
        }
        setChartData(last7Days);
        
        // Prepare category data
        const categories = {};
        data.transactions.forEach(txn => {
          const type = txn.transaction_type || 'other';
          if (!categories[type]) {
            categories[type] = { name: type, value: 0, count: 0 };
          }
          categories[type].value += Math.abs(parseFloat(txn.amount || 0));
          categories[type].count += 1;
        });
        setCategoryData(Object.values(categories));
      }
    } catch (error) {
      console.error('Error fetching transactions for charts:', error);
    }
  };
  
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
    // Allow access to basic features without profile completion
    const basicFeatures = ['profile', 'overview', 'ai', 'complaint', 'complaint-tracking'];
    
    if (!profileCompleted && !basicFeatures.includes(tab)) {
      // Show profile required message for banking features
      setActiveTab(tab); // Still set the tab to show the profile required message
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
        return !profileCompleted ? showProfileRequired() : <AccountManagement kycCompleted={kycCompleted} showKycRequired={showKycRequired} onNavigateToKyc={navigateToKyc} />;
      case 'transfer': 
        return !profileCompleted ? showProfileRequired() : <Transfer kycCompleted={kycCompleted} showKycRequired={showKycRequired} onNavigateToKyc={navigateToKyc} />;
      case 'transactions': 
        return !profileCompleted ? showProfileRequired() : <TransactionHistory kycCompleted={kycCompleted} showKycRequired={showKycRequired} onNavigateToKyc={navigateToKyc} />;
      case 'kyc': 
        return !profileCompleted ? showProfileRequired() : <KYCVerification setKycCompleted={setKycCompleted} onKycComplete={checkUserStatus} />;

      case 'complaint': return <Complaint />;
      case 'complaint-tracking': return <ComplaintTracking />;
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

          {/* Financial Overview Charts */}
          {accountInfo && transactions.length > 0 && (
            <div className="charts-section" style={{ marginTop: '30px', padding: '20px', background: '#f8f9fa', borderRadius: '10px' }}>
              <h3 style={{ marginBottom: '20px', color: '#2c3e50' }}>📊 Financial Overview</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px', marginBottom: '20px' }}>
                {/* Balance Trend Chart */}
                <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                  <h4 style={{ marginBottom: '15px', color: '#34495e' }}>Balance Trend (Last 7 Days)</h4>
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip formatter={(value) => `₹${value.toLocaleString('en-IN')}`} />
                      <Area type="monotone" dataKey="balance" stroke="#3498db" fill="#3498db" fillOpacity={0.6} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>

                {/* Transaction Categories Pie Chart */}
                <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                  <h4 style={{ marginBottom: '15px', color: '#34495e' }}>Transaction Categories</h4>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={categoryData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {categoryData.map((entry, index) => {
                          const COLORS = ['#3498db', '#2ecc71', '#e74c3c', '#f39c12', '#9b59b6', '#1abc9c'];
                          return <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />;
                        })}
                      </Pie>
                      <Tooltip formatter={(value) => `₹${value.toLocaleString('en-IN')}`} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
                {/* Transaction Volume Chart */}
                <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                  <h4 style={{ marginBottom: '15px', color: '#34495e' }}>Transaction Volume (Last 7 Days)</h4>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="transactions" fill="#2ecc71" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Spending by Category */}
                <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                  <h4 style={{ marginBottom: '15px', color: '#34495e' }}>Spending by Category</h4>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={categoryData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={100} />
                      <Tooltip formatter={(value) => `₹${value.toLocaleString('en-IN')}`} />
                      <Bar dataKey="value" fill="#e74c3c" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
          
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
          
          <div className="complaints-section">
            <div className="journey-icon" onClick={() => setShowComplaints(!showComplaints)}>
              📋 Show Complaint Error Codes
            </div>
            
            {showComplaints && (
              <div className="complaints-display">
                <h3>🚨 Complete Transaction Error Code System</h3>
                <p className="error-intro">Understanding what each error code means and what action will be taken:</p>
                
                <div className="error-category">
                  <h4 className="category-header receiver-bank">🏦 Receiver Bank Related Errors</h4>
                  <div className="error-codes-grid">
                    <div className="error-code-card medium">
                      <div className="error-header"><span className="code">U28</span><span className="badge medium">MEDIUM</span></div>
                      <div className="error-detail"><strong>What Happened:</strong> Receiver bank server down</div>
                      <div className="error-solution"><strong>System Solution:</strong> Mark transaction FAILED → Auto-refund</div>
                      <div className="error-message"><strong>User Message:</strong> "Receiver bank is temporarily unavailable. Amount will be refunded."</div>
                    </div>
                    <div className="error-code-card high">
                      <div className="error-header"><span className="code">U20</span><span className="badge high">HIGH</span></div>
                      <div className="error-detail"><strong>What Happened:</strong> Receiver bank didn't respond</div>
                      <div className="error-solution"><strong>System Solution:</strong> Retry once → If still failed → Refund</div>
                      <div className="error-message"><strong>User Message:</strong> "Bank response delayed. Refund initiated."</div>
                    </div>
                    <div className="error-code-card medium">
                      <div className="error-header"><span className="code">U13</span><span className="badge medium">MEDIUM</span></div>
                      <div className="error-detail"><strong>What Happened:</strong> Receiver bank unstable</div>
                      <div className="error-solution"><strong>System Solution:</strong> Put txn in PENDING → Auto-reverse after T+1</div>
                      <div className="error-message"><strong>User Message:</strong> "Transaction delayed due to bank network issue."</div>
                    </div>
                    <div className="error-code-card low">
                      <div className="error-header"><span className="code">U14</span><span className="badge low">LOW</span></div>
                      <div className="error-detail"><strong>What Happened:</strong> Wrong account/VPA</div>
                      <div className="error-solution"><strong>System Solution:</strong> Fail immediately → No retry → No refund delay</div>
                      <div className="error-message"><strong>User Message:</strong> "Invalid receiver details. Please check and retry."</div>
                      <div className="safe-note">✅ <strong>Money Safe:</strong> No refund needed because money was never debited.</div>
                    </div>
                    <div className="error-code-card high">
                      <div className="error-header"><span className="code">U18</span><span className="badge high">HIGH</span></div>
                      <div className="error-detail"><strong>What Happened:</strong> Receiver internal failure</div>
                      <div className="error-solution"><strong>System Solution:</strong> Fail → Auto-refund</div>
                      <div className="error-message"><strong>User Message:</strong> "Receiver bank technical issue. Refund initiated."</div>
                    </div>
                  </div>
                </div>
                
                <div className="error-category">
                  <h4 className="category-header sender-bank">🏦 Sender Bank Related Errors</h4>
                  <div className="error-codes-grid">
                    <div className="error-code-card high">
                      <div className="error-header"><span className="code">S05</span><span className="badge high">HIGH</span></div>
                      <div className="error-detail"><strong>What Happened:</strong> Sender bank timeout</div>
                      <div className="error-solution"><strong>System Solution:</strong> Retry internally → Fail → Refund</div>
                      <div className="error-message"><strong>User Message:</strong> "Transaction timed out. Refund initiated."</div>
                    </div>
                    <div className="error-code-card low">
                      <div className="error-header"><span className="code">S10</span><span className="badge low">LOW</span></div>
                      <div className="error-detail"><strong>What Happened:</strong> Insufficient balance</div>
                      <div className="error-solution"><strong>System Solution:</strong> Block transaction → No debit</div>
                      <div className="error-message"><strong>User Message:</strong> "Insufficient balance."</div>
                      <div className="safe-note">✅ <strong>Money Safe:</strong> No refund needed because money was never debited.</div>
                    </div>
                    <div className="error-code-card critical">
                      <div className="error-header"><span className="code">S22</span><span className="badge critical">CRITICAL</span></div>
                      <div className="error-detail"><strong>What Happened:</strong> Sender CBS down</div>
                      <div className="error-solution"><strong>System Solution:</strong> Put txn in PENDING → Retry → Refund if unresolved</div>
                      <div className="error-message"><strong>User Message:</strong> "System issue. Transaction will be reversed if not completed."</div>
                    </div>
                    <div className="error-code-card critical">
                      <div className="error-header"><span className="code">S31</span><span className="badge critical">CRITICAL</span></div>
                      <div className="error-detail"><strong>What Happened:</strong> Debit success, confirmation lost</div>
                      <div className="error-solution"><strong>System Solution:</strong> Reconcile → If credit not done → Refund</div>
                      <div className="error-message"><strong>User Message:</strong> "Amount temporarily debited. Reversal in progress."</div>
                      <div className="complaint-note">⚠️ <strong>Requires Complaint:</strong> Money debited, raise complaint for refund</div>
                    </div>
                  </div>
                </div>
                
                <div className="error-category">
                  <h4 className="category-header npci-switch">🔄 NPCI / Payment Switch Errors</h4>
                  <div className="error-codes-grid">
                    <div className="error-code-card medium">
                      <div className="error-header"><span className="code">R05</span><span className="badge medium">MEDIUM</span></div>
                      <div className="error-detail"><strong>What Happened:</strong> NPCI rejected request</div>
                      <div className="error-solution"><strong>System Solution:</strong> Mark FAILED → Refund</div>
                      <div className="error-message"><strong>User Message:</strong> "Transaction rejected by payment network."</div>
                    </div>
                    <div className="error-code-card low">
                      <div className="error-header"><span className="code">R10</span><span className="badge low">LOW</span></div>
                      <div className="error-detail"><strong>What Happened:</strong> Duplicate request</div>
                      <div className="error-solution"><strong>System Solution:</strong> Ignore duplicate → Show previous txn status</div>
                      <div className="error-message"><strong>User Message:</strong> "Duplicate transaction detected."</div>
                    </div>
                    <div className="error-code-card medium">
                      <div className="error-header"><span className="code">R13</span><span className="badge medium">MEDIUM</span></div>
                      <div className="error-detail"><strong>What Happened:</strong> Routing failed</div>
                      <div className="error-solution"><strong>System Solution:</strong> Fail → Refund</div>
                      <div className="error-message"><strong>User Message:</strong> "Unable to reach receiver bank."</div>
                    </div>
                    <div className="error-code-card medium">
                      <div className="error-header"><span className="code">R30</span><span className="badge medium">MEDIUM</span></div>
                      <div className="error-detail"><strong>What Happened:</strong> NPCI outage</div>
                      <div className="error-solution"><strong>System Solution:</strong> Mark PENDING → Auto-reverse after T+1</div>
                      <div className="error-message"><strong>User Message:</strong> "Payment network down. Refund if not completed."</div>
                    </div>
                  </div>
                </div>
                
                <div className="error-category">
                  <h4 className="category-header network-timeout">🌐 Network / Timeout Errors</h4>
                  <div className="error-codes-grid">
                    <div className="error-code-card high">
                      <div className="error-header"><span className="code">T01</span><span className="badge high">HIGH</span></div>
                      <div className="error-detail"><strong>What Happened:</strong> Network dropped</div>
                      <div className="error-solution"><strong>System Solution:</strong> Retry once → Fail → Refund</div>
                      <div className="error-message"><strong>User Message:</strong> "Network error occurred. Refund initiated."</div>
                      <div className="complaint-note">⚠️ <strong>Requires Complaint:</strong> Money debited, raise complaint for refund</div>
                    </div>
                    <div className="error-code-card medium">
                      <div className="error-header"><span className="code">T05</span><span className="badge medium">MEDIUM</span></div>
                      <div className="error-detail"><strong>What Happened:</strong> NPCI timeout</div>
                      <div className="error-solution"><strong>System Solution:</strong> Retry → Pending → Reverse</div>
                      <div className="error-message"><strong>User Message:</strong> "Transaction delayed due to network."</div>
                    </div>
                    <div className="error-code-card high">
                      <div className="error-header"><span className="code">T06</span><span className="badge high">HIGH</span></div>
                      <div className="error-detail"><strong>What Happened:</strong> Bank endpoint timeout</div>
                      <div className="error-solution"><strong>System Solution:</strong> Retry → Fail → Refund</div>
                      <div className="error-message"><strong>User Message:</strong> "Bank not responding. Refund initiated."</div>
                    </div>
                  </div>
                </div>
                
                <div className="error-category">
                  <h4 className="category-header customer-input">👤 Customer Input Errors</h4>
                  <div className="error-codes-grid">
                    <div className="error-code-card low">
                      <div className="error-header"><span className="code">C01</span><span className="badge low">LOW</span></div>
                      <div className="error-detail"><strong>What Happened:</strong> Invalid UPI/VPA</div>
                      <div className="error-solution"><strong>System Solution:</strong> Fail immediately</div>
                      <div className="error-message"><strong>User Message:</strong> "Invalid UPI ID."</div>
                      <div className="safe-note">✅ <strong>Money Safe:</strong> No refund needed because money was never debited.</div>
                    </div>
                    <div className="error-code-card low">
                      <div className="error-header"><span className="code">C02</span><span className="badge low">LOW</span></div>
                      <div className="error-detail"><strong>What Happened:</strong> Wrong account number</div>
                      <div className="error-solution"><strong>System Solution:</strong> Fail immediately</div>
                      <div className="error-message"><strong>User Message:</strong> "Invalid account number."</div>
                      <div className="safe-note">✅ <strong>Money Safe:</strong> No refund needed because money was never debited.</div>
                    </div>
                    <div className="error-code-card low">
                      <div className="error-header"><span className="code">C03</span><span className="badge low">LOW</span></div>
                      <div className="error-detail"><strong>What Happened:</strong> Wrong IFSC</div>
                      <div className="error-solution"><strong>System Solution:</strong> Fail immediately</div>
                      <div className="error-message"><strong>User Message:</strong> "Invalid IFSC code."</div>
                      <div className="safe-note">✅ <strong>Money Safe:</strong> No refund needed because money was never debited.</div>
                    </div>
                    <div className="error-code-card low">
                      <div className="error-header"><span className="code">C05</span><span className="badge low">LOW</span></div>
                      <div className="error-detail"><strong>What Happened:</strong> User cancelled payment</div>
                      <div className="error-solution"><strong>System Solution:</strong> Cancel transaction</div>
                      <div className="error-message"><strong>User Message:</strong> "Transaction cancelled by you."</div>
                      <div className="safe-note">✅ <strong>Money Safe:</strong> No refund needed because money was never debited.</div>
                    </div>
                  </div>
                </div>
                
                <div className="error-legend">
                  <h4>📊 Error Code Priority Legend</h4>
                  <div className="legend-grid">
                    <div className="legend-item">
                      <span className="legend-badge critical">CRITICAL</span>
                      <span>Money stuck, immediate complaint needed</span>
                    </div>
                    <div className="legend-item">
                      <span className="legend-badge high">HIGH</span>
                      <span>Auto-refund processed</span>
                    </div>
                    <div className="legend-item">
                      <span className="legend-badge medium">MEDIUM</span>
                      <span>System will auto-resolve</span>
                    </div>
                    <div className="legend-item">
                      <span className="legend-badge low">LOW</span>
                      <span>No action needed, money safe</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
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
          <button className={activeTab === 'kyc' ? 'active' : ''} onClick={() => handleTabClick('kyc')}>KYC</button>
          <button className={activeTab === 'ai' ? 'active' : ''} onClick={() => handleTabClick('ai')}>AI Assistant</button>
          <div className="complaints-dropdown">
            <button 
              className={`dropdown-btn ${(activeTab === 'complaint' || activeTab === 'complaint-tracking') ? 'active' : ''}`}
              onClick={() => setShowComplaintsDropdown(!showComplaintsDropdown)}
            >
              Complaints ▼
            </button>
            {showComplaintsDropdown && (
              <div className="dropdown-menu complaints-menu">
                <button onClick={() => { handleTabClick('complaint'); setShowComplaintsDropdown(false); }}>Raise a Complaint</button>
                <button onClick={() => { handleTabClick('complaint-tracking'); setShowComplaintsDropdown(false); }}>Track a Complaint</button>
              </div>
            )}
          </div>
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