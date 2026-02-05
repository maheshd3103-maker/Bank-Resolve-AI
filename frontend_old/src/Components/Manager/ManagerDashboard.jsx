import React, { useState } from 'react';
import UserManagement from './UserManagement';
import KYCApprovals from './KYCApprovals';
import LoanApprovals from './LoanApprovals';
import TransactionMonitoring from './TransactionMonitoring';
import ComplianceReports from './ComplianceReports';
import SystemSettings from './SystemSettings';

const ManagerDashboard = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [kycStats, setKycStats] = useState({ pending: 0, approved: 0, rejected: 0 });
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
        const stats = {
          pending: kycData.applications.filter(app => app.status === 'pending' || app.status === 'first_approved').length,
          approved: kycData.applications.filter(app => app.status === 'verified' || app.status === 'rejected').length
        };
        setKycStats(stats);
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
              <h3>Processed KYC</h3>
              <div className="stat-number">{kycStats.approved}</div>
            </div>
            <div className="stat-card">
              <h3>Total Applications</h3>
              <div className="stat-number">{kycStats.pending + kycStats.approved}</div>
            </div>
          </div>
          <div className="quick-actions">
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