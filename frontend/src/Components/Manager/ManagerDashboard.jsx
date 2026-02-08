import React, { useState } from 'react';
import UserManagement from './UserManagement';
import KYCApprovals from './KYCApprovals';
import LoanApprovals from './LoanApprovals';
import TransactionMonitoring from './TransactionMonitoring';
import ComplianceReports from './ComplianceReports';
import SystemSettings from './SystemSettings';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';

const ManagerDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [kycStats, setKycStats] = useState({ pending: 0, approved: 0, rejected: 0 });
  const [transactionStats, setTransactionStats] = useState([]);
  const [customerGrowth, setCustomerGrowth] = useState([]);
  const [manager] = useState({ 
    name: localStorage.getItem('user_name') || 'Manager', 
    role: 'Bank Manager' 
  });

  const fetchDashboardStats = async () => {
    try {
      // Fetch customer count
      const customerResponse = await fetch('http://localhost:5000/api/manager/customers');
      const customerData = await customerResponse.json();
      if (customerData.success) {
        setTotalCustomers(customerData.total_count);
      }
      
      // Fetch KYC statistics
      const kycResponse = await fetch('http://localhost:5000/api/manager/kyc-applications');
      const kycData = await kycResponse.json();
      if (kycData.success) {
        const pending = kycData.applications.filter(app => app.status === 'pending' || app.status === 'first_approved').length;
        const approved = kycData.applications.filter(app => app.status === 'verified').length;
        const rejected = kycData.applications.filter(app => app.status === 'rejected').length;
        setKycStats({ pending, approved, rejected });
      }
      
      // Fetch transaction statistics
      const transactionResponse = await fetch('http://localhost:5000/api/manager/transactions');
      const transactionData = await transactionResponse.json();
      if (transactionData.success) {
        // Prepare transaction trend data (last 7 days)
        const last7Days = [];
        const today = new Date();
        for (let i = 6; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          
          const dayTransactions = transactionData.transactions.filter(t => {
            const txnDate = new Date(t.created_at).toISOString().split('T')[0];
            return txnDate === dateStr;
          });
          
          const successful = dayTransactions.filter(t => t.status === 'completed' || t.status === 'success').length;
          const failed = dayTransactions.filter(t => t.status === 'failed').length;
          
          last7Days.push({
            date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            successful,
            failed,
            total: dayTransactions.length
          });
        }
        setTransactionStats(last7Days);
        
        // Simulate customer growth (last 7 days)
        const growthData = [];
        for (let i = 6; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          growthData.push({
            date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            customers: Math.floor(totalCustomers * (0.95 + (i * 0.01)))
          });
        }
        setCustomerGrowth(growthData);
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    }
  };

  React.useEffect(() => {
    fetchDashboardStats();
  }, []);

  const renderContent = () => {
    switch(activeTab) {
      case 'users': return <UserManagement />;
      case 'kyc': return <KYCApprovals />;
      case 'loans': return <LoanApprovals />;
      case 'transactions': return <TransactionMonitoring />;
      case 'compliance': return <ComplianceReports />;
      case 'settings': return <SystemSettings />;
      default: return (
        <div className="manager-overview">
          <div className="stats-grid">
            <div className="stat-card">
              <h3>Total Customers</h3>
              <div className="stat-number">{totalCustomers}</div>
            </div>
            <div className="stat-card">
              <h3>Pending KYC</h3>
              <div className="stat-number">{kycStats.pending}</div>
            </div>
            <div className="stat-card">
              <h3>Approved KYC</h3>
              <div className="stat-number">{kycStats.approved}</div>
            </div>
            <div className="stat-card">
              <h3>Rejected KYC</h3>
              <div className="stat-number">{kycStats.rejected}</div>
            </div>
          </div>

          {/* Visualizations Section */}
          <div style={{ marginTop: '30px', padding: '20px', background: '#f8f9fa', borderRadius: '10px' }}>
            <h3 style={{ marginBottom: '20px', color: '#2c3e50' }}>📊 Analytics Dashboard</h3>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px', marginBottom: '20px' }}>
              {/* KYC Status Pie Chart */}
              <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                <h4 style={{ marginBottom: '15px', color: '#34495e' }}>KYC Status Distribution</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: 'Pending', value: kycStats.pending, color: '#f39c12' },
                        { name: 'Approved', value: kycStats.approved, color: '#2ecc71' },
                        { name: 'Rejected', value: kycStats.rejected, color: '#e74c3c' }
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {[
                        { name: 'Pending', value: kycStats.pending, color: '#f39c12' },
                        { name: 'Approved', value: kycStats.approved, color: '#2ecc71' },
                        { name: 'Rejected', value: kycStats.rejected, color: '#e74c3c' }
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Transaction Success Rate */}
              <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                <h4 style={{ marginBottom: '15px', color: '#34495e' }}>Transaction Trends (Last 7 Days)</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={transactionStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="successful" stroke="#2ecc71" strokeWidth={2} name="Successful" />
                    <Line type="monotone" dataKey="failed" stroke="#e74c3c" strokeWidth={2} name="Failed" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
              {/* Customer Growth */}
              <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                <h4 style={{ marginBottom: '15px', color: '#34495e' }}>Customer Growth Trend</h4>
                <ResponsiveContainer width="100%" height={250}>
                  <AreaChart data={customerGrowth}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="customers" stroke="#3498db" fill="#3498db" fillOpacity={0.6} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Transaction Volume */}
              <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                <h4 style={{ marginBottom: '15px', color: '#34495e' }}>Transaction Volume (Last 7 Days)</h4>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={transactionStats}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="total" fill="#3498db" name="Total Transactions" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="quick-actions" style={{ marginTop: '20px' }}>
            <button onClick={() => setActiveTab('kyc')}>Review KYC Applications</button>
            <button onClick={() => setActiveTab('loans')}>Approve Loans</button>
            <button onClick={() => setActiveTab('transactions')}>Monitor Transactions</button>
          </div>
        </div>
      );
    }
  };

  return (
    <div className="manager-dashboard">
      <nav className="manager-nav">
        <div className="nav-brand">
          <h1>BankSecure AI - Manager</h1>
          <span>{manager.role}: {manager.name}</span>
        </div>
        <div className="nav-tabs">
          <button className={activeTab === 'overview' ? 'active' : ''} onClick={() => setActiveTab('overview')}>Overview</button>
          <button className={activeTab === 'users' ? 'active' : ''} onClick={() => setActiveTab('users')}>Users</button>
          <button className={activeTab === 'kyc' ? 'active' : ''} onClick={() => setActiveTab('kyc')}>KYC Approvals</button>
          <button className={activeTab === 'loans' ? 'active' : ''} onClick={() => setActiveTab('loans')}>Loan Approvals</button>
          <button className={activeTab === 'transactions' ? 'active' : ''} onClick={() => setActiveTab('transactions')}>Transactions</button>
          <button className={activeTab === 'compliance' ? 'active' : ''} onClick={() => setActiveTab('compliance')}>Compliance</button>
          <button className={activeTab === 'settings' ? 'active' : ''} onClick={() => setActiveTab('settings')}>Settings</button>
        </div>
        <button className="logout-btn" onClick={() => {
          localStorage.removeItem('user_id');
          localStorage.removeItem('user_name');
          localStorage.removeItem('user_role');
          window.location.reload();
        }}>Logout</button>
      </nav>
      <main className="manager-content">
        {renderContent()}
      </main>
    </div>
  );
};

export default ManagerDashboard;