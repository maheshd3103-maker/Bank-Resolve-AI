import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowUpRight, ArrowDownRight, TrendingUp, ArrowRight,
  DollarSign, Building2, Wallet, Plus, RefreshCw
} from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { profileAPI, transactionAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import '../styles/Dashboard.css';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState('daily');

  useEffect(() => {
    loadDashboardData();
  }, [user?.id]);

  const loadDashboardData = async () => {
    if (!user?.id) return;

    try {
      const [profileRes, transactionsRes] = await Promise.all([
        profileAPI.getProfile(user.id),
        transactionAPI.getTransactions(user.id),
      ]);

      if (profileRes.data.success) {
        setProfile(profileRes.data.profile);
      }

      if (transactionsRes.data.success) {
        setTransactions(transactionsRes.data.transactions);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate expenses by category
  const calculateExpenses = () => {
    const expensesByCategory = {
      Entertainment: 0,
      Food: 0,
      Bills: 0,
      Health: 0,
      Education: 0,
      Clothes: 0,
      Other: 0,
    };

    transactions.forEach(txn => {
      if (txn.transaction_type === 'transfer' || txn.transaction_type === 'failed_transfer') {
        const amount = Math.abs(parseFloat(txn.amount));
        const desc = txn.description?.toLowerCase() || '';
        
        if (desc.includes('entertainment') || desc.includes('movie')) {
          expensesByCategory.Entertainment += amount;
        } else if (desc.includes('food') || desc.includes('restaurant')) {
          expensesByCategory.Food += amount;
        } else if (desc.includes('bill') || desc.includes('utility')) {
          expensesByCategory.Bills += amount;
        } else if (desc.includes('health') || desc.includes('pharmacy')) {
          expensesByCategory.Health += amount;
        } else if (desc.includes('education') || desc.includes('school')) {
          expensesByCategory.Education += amount;
        } else if (desc.includes('cloth') || desc.includes('fashion')) {
          expensesByCategory.Clothes += amount;
        } else {
          expensesByCategory.Other += amount;
        }
      }
    });

    return Object.entries(expensesByCategory)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({ name, value }));
  };

  const expenseData = calculateExpenses();
  const totalExpenses = expenseData.reduce((sum, item) => sum + item.value, 0);

  const COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#64748b'];

  // Mock linked accounts - in real app, fetch from API
  const linkedAccounts = [
    { name: 'Santander', number: '** **** 9488', balance: 12220.45, logo: '🏦', color: '#ef4444' },
    { name: 'CityBank', number: '** **** 8854', balance: 25070.65, logo: '🏛️', color: '#3b82f6' },
    { name: 'Deutsche Bank', number: '** **** 9821', balance: 570.00, logo: '🏢', color: '#1e40af' },
    { name: 'Credit Agricole', number: '** **** 7658', balance: 2680.00, logo: '🏦', color: '#10b981' },
  ];

  const getCategoryIcon = (desc) => {
    const description = desc?.toLowerCase() || '';
    if (description.includes('food')) return '🍔';
    if (description.includes('entertainment')) return '🎬';
    if (description.includes('pharmacy')) return '⚕️';
    if (description.includes('salary')) return '💰';
    if (description.includes('cloth')) return '👕';
    if (description.includes('deposit')) return '💵';
    if (description.includes('refund')) return '↩️';
    return '💳';
  };

  const getCategoryColor = (desc) => {
    const description = desc?.toLowerCase() || '';
    if (description.includes('food')) return '#f59e0b';
    if (description.includes('entertainment')) return '#ef4444';
    if (description.includes('pharmacy')) return '#3b82f6';
    if (description.includes('salary')) return '#10b981';
    return '#64748b';
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="loading-container">
          <div className="spinner"></div>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="dashboard-container">
        <div className="dashboard-content">
          {/* Main Account Card */}
          <div className="main-account-card">
            <div className="account-header">
              <div>
                <p className="account-label">Main account</p>
                <h2 className="account-name">NevBank Savings Account</h2>
                <p className="account-number">
                  {profile?.account_number || 'Account not active'} 
                  <ArrowRight size={16} className="ml-1" />
                </p>
              </div>
              <div className="account-actions">
                <button className="btn btn-primary" onClick={() => navigate('/transfer')}>
                  <ArrowUpRight size={18} />
                  Transfer money
                </button>
                <button className="btn btn-outline">
                  Link accounts
                </button>
              </div>
            </div>
            
            <div className="account-balance-section">
              <div className="balance-info">
                <p className="balance-label">Available funds</p>
                <h1 className="balance-amount">
                  {parseFloat(profile?.balance || 0).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                  <span className="currency">$</span>
                </h1>
              </div>

              <div className="standing-orders-card">
                <div className="standing-orders-icon">
                  <RefreshCw size={24} />
                </div>
                <div>
                  <h3 className="standing-title">Define standing orders</h3>
                  <p className="standing-desc">
                    We help you avoid missing required payments<br />
                    We'll take care of your regular transfers
                  </p>
                  <button className="btn btn-secondary mt-2">
                    Define standing order
                  </button>
                </div>
                <div className="standing-illustration">
                  📋
                </div>
              </div>
            </div>
          </div>

          {/* Linked Accounts Grid */}
          <div className="linked-accounts-grid">
            {linkedAccounts.map((account, index) => (
              <div key={index} className="linked-account-card">
                <div className="account-card-header">
                  <div className="bank-logo" style={{ background: account.color }}>
                    {account.logo}
                  </div>
                  <div>
                    <h3 className="bank-name">{account.name}</h3>
                    <p className="bank-account-number">{account.number}</p>
                  </div>
                </div>
                <div className="account-card-balance">
                  {account.balance.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })} <span className="currency-symbol">$</span>
                </div>
              </div>
            ))}
          </div>

          {/* Transactions and Expenses Section */}
          <div className="bottom-section">
            {/* Latest Transactions */}
            <div className="transactions-card card">
              <div className="card-header">
                <div>
                  <h3 className="card-title">Latest transactions</h3>
                  <div className="filter-tabs">
                    <button className="filter-tab active">Today</button>
                    <button className="filter-tab">Yesterday</button>
                    <button className="filter-tab">20.04</button>
                  </div>
                </div>
                <button className="see-more-btn">
                  See more <ArrowRight size={16} />
                </button>
              </div>

              <div className="transactions-list">
                {transactions.slice(0, 6).map((txn, index) => (
                  <div key={index} className="transaction-item">
                    <div className="transaction-icon">
                      {getCategoryIcon(txn.description)}
                    </div>
                    <div className="transaction-info">
                      <p className="transaction-name">
                        {txn.description || 'Transaction'}
                      </p>
                      <p className="transaction-type">
                        {txn.transaction_type === 'deposit' ? 'Deposit' : 
                         txn.transaction_type === 'transfer' ? 'Transfer' :
                         txn.transaction_type === 'refund' ? 'Refund' : 'Payment'}
                      </p>
                    </div>
                    <div className="transaction-category">
                      <span 
                        className="category-dot"
                        style={{ background: getCategoryColor(txn.description) }}
                      ></span>
                      {txn.transaction_type}
                    </div>
                    <div className={`transaction-amount ${
                      txn.transaction_type === 'deposit' || txn.transaction_type === 'refund' 
                        ? 'positive' : 'negative'
                    }`}>
                      {txn.transaction_type === 'deposit' || txn.transaction_type === 'refund' 
                        ? '+' : '-'}
                      {Math.abs(parseFloat(txn.amount)).toFixed(2)} $
                      <button className="expand-btn">
                        <ArrowDownRight size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* All Expenses */}
            <div className="expenses-card card">
              <div className="card-header">
                <h3 className="card-title">All expenses</h3>
                <div className="expense-filters">
                  <button 
                    className={timeFilter === 'daily' ? 'active' : ''}
                    onClick={() => setTimeFilter('daily')}
                  >
                    daily
                  </button>
                  <button 
                    className={timeFilter === 'weekly' ? 'active' : ''}
                    onClick={() => setTimeFilter('weekly')}
                  >
                    weekly
                  </button>
                  <button 
                    className={timeFilter === 'monthly' ? 'active' : ''}
                    onClick={() => setTimeFilter('monthly')}
                  >
                    monthly
                  </button>
                </div>
              </div>

              <div className="expense-amount-grid">
                <div className="expense-stat">
                  <span className="expense-label">daily</span>
                  <span className="expense-value">275.40 $</span>
                </div>
                <div className="expense-stat">
                  <span className="expense-label">weekly</span>
                  <span className="expense-value">1,420.65 $</span>
                </div>
                <div className="expense-stat">
                  <span className="expense-label">monthly</span>
                  <span className="expense-value">8,200.30 $</span>
                </div>
              </div>

              <div className="expense-chart-container">
                <div className="expense-chart">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={expenseData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {expenseData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="chart-center">
                    <p className="chart-label">Last month</p>
                    <p className="chart-value">{totalExpenses.toFixed(0)} $</p>
                  </div>
                </div>

                <div className="expense-legend">
                  {expenseData.map((item, index) => (
                    <div key={index} className="legend-item">
                      <span 
                        className="legend-color"
                        style={{ background: COLORS[index % COLORS.length] }}
                      ></span>
                      <span className="legend-label">{item.name}</span>
                    </div>
                  ))}
                  {expenseData.length === 0 && (
                    <p className="no-data-text">No expense data available</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Dashboard;

