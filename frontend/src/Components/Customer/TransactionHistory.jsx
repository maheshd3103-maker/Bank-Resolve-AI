import React, { useState, useEffect } from 'react';
import Notification from '../Notification';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';

const TransactionHistory = ({ kycCompleted, showKycRequired, onNavigateToKyc }) => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [categoryData, setCategoryData] = useState([]);
  const [statusData, setStatusData] = useState([]);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const userId = localStorage.getItem('user_id');
      console.log('Fetching transactions for user:', userId);
      const response = await fetch(`http://localhost:5000/api/transactions/${userId}`);
      const data = await response.json();
      
      console.log('Transaction response:', data);
      if (data.success) {
        setTransactions(data.transactions);
        console.log('Transactions loaded:', data.transactions.length);
        
        // Prepare chart data for spending trends (last 30 days)
        const last30Days = [];
        const today = new Date();
        for (let i = 29; i >= 0; i--) {
          const date = new Date(today);
          date.setDate(date.getDate() - i);
          const dateStr = date.toISOString().split('T')[0];
          
          const dayTransactions = data.transactions.filter(t => {
            const txnDate = new Date(t.created_at).toISOString().split('T')[0];
            return txnDate === dateStr;
          });
          
          const credits = dayTransactions
            .filter(t => t.transaction_type === 'deposit' || t.transaction_type === 'credit')
            .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
          
          const debits = dayTransactions
            .filter(t => t.transaction_type === 'transfer' || t.transaction_type === 'debit')
            .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
          
          last30Days.push({
            date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            credits,
            debits,
            net: credits - debits
          });
        }
        setChartData(last30Days);
        
        // Prepare category data
        const categories = {};
        data.transactions.forEach(txn => {
          const type = txn.transaction_type || 'other';
          if (!categories[type]) {
            categories[type] = { name: type, value: 0 };
          }
          categories[type].value += Math.abs(parseFloat(txn.amount || 0));
        });
        setCategoryData(Object.values(categories));
        
        // Prepare status data
        const statusCounts = {};
        data.transactions.forEach(txn => {
          const status = txn.status || 'completed';
          statusCounts[status] = (statusCounts[status] || 0) + 1;
        });
        setStatusData(Object.entries(statusCounts).map(([name, value]) => ({ name, value })));
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!kycCompleted) {
    return (
      <div className="history-page">
        {notification && (
          <Notification 
            type={notification.type}
            message={notification.message}
            onClose={() => setNotification(null)}
          />
        )}
        <div className="kyc-required">
          <div className="requirement-card">
            <div className="requirement-icon">🔒</div>
            <h3>KYC Verification Required</h3>
            <p>Please complete KYC verification to access transaction history.</p>
            <button onClick={() => onNavigateToKyc && onNavigateToKyc()} className="complete-profile-btn">
              Complete KYC Now
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="history-page">
        <h2>Transaction History</h2>
        <div className="loading">Loading transactions...</div>
      </div>
    );
  }

  return (
    <div className="history-page">
      {notification && (
        <Notification 
          type={notification.type}
          message={notification.message}
          onClose={() => setNotification(null)}
        />
      )}
      <h2>Transaction History</h2>
      
      {/* Visualizations Section */}
      {transactions.length > 0 && (
        <div style={{ marginBottom: '30px', padding: '20px', background: '#f8f9fa', borderRadius: '10px' }}>
          <h3 style={{ marginBottom: '20px', color: '#2c3e50' }}>📊 Transaction Analytics</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px', marginBottom: '20px' }}>
            {/* Spending Trends */}
            <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              <h4 style={{ marginBottom: '15px', color: '#34495e' }}>Spending Trends (Last 30 Days)</h4>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip formatter={(value) => `₹${value.toLocaleString('en-IN')}`} />
                  <Legend />
                  <Area type="monotone" dataKey="credits" stackId="1" stroke="#2ecc71" fill="#2ecc71" fillOpacity={0.6} name="Credits" />
                  <Area type="monotone" dataKey="debits" stackId="1" stroke="#e74c3c" fill="#e74c3c" fillOpacity={0.6} name="Debits" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Transaction Status Distribution */}
            <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              <h4 style={{ marginBottom: '15px', color: '#34495e' }}>Transaction Status</h4>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => {
                      const COLORS = ['#2ecc71', '#e74c3c', '#f39c12', '#3498db'];
                      return <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />;
                    })}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
            {/* Transaction Categories */}
            <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              <h4 style={{ marginBottom: '15px', color: '#34495e' }}>Transaction by Category</h4>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={categoryData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip formatter={(value) => `₹${value.toLocaleString('en-IN')}`} />
                  <Bar dataKey="value" fill="#3498db" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Net Flow */}
            <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              <h4 style={{ marginBottom: '15px', color: '#34495e' }}>Net Cash Flow (Last 30 Days)</h4>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" angle={-45} textAnchor="end" height={80} />
                  <YAxis />
                  <Tooltip formatter={(value) => `₹${value.toLocaleString('en-IN')}`} />
                  <Line type="monotone" dataKey="net" stroke="#9b59b6" strokeWidth={2} name="Net Flow" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
      
      <div className="history-filters">
        <div className="filter-row">
          <div className="filter-group">
            <label>Type</label>
            <select>
              <option>All Types</option>
              <option>Deposits</option>
              <option>Transfers</option>
              <option>Withdrawals</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Status</label>
            <select>
              <option>All Status</option>
              <option>Completed</option>
              <option>Failed</option>
              <option>Pending</option>
            </select>
          </div>
          <div className="filter-group">
            <label>Period</label>
            <select>
              <option>Last 30 days</option>
              <option>Last 3 months</option>
              <option>Last year</option>
            </select>
          </div>
          <button className="filter-btn">Apply Filters</button>
        </div>
      </div>

      <div className="transactions-table">
        <div className="transactions-header">
          <span>Transaction ID</span>
          <span>Date</span>
          <span>Type</span>
          <span>Description</span>
          <span>Before Balance</span>
          <span>Amount</span>
          <span>After Balance</span>
          <span>Status</span>
        </div>
        
        {transactions.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📊</div>
            <h3>No Transactions Yet</h3>
            <p>Your transaction history will appear here once you start making deposits or transfers.</p>
          </div>
        ) : (
          transactions.map((transaction, index) => (
            <div key={index} className="transaction-row">
              <span className="transaction-id">{transaction.transaction_id || 'N/A'}</span>
              <span>{new Date(transaction.created_at).toLocaleDateString()}</span>
              <span className="transaction-type">{transaction.transaction_type}</span>
              <span>{transaction.description}</span>
              <span className="balance-before">₹{parseFloat(transaction.before_balance || 0).toFixed(2)}</span>
              <span className={`transaction-amount ${transaction.transaction_type === 'deposit' || transaction.transaction_type === 'credit' ? 'credit' : 'debit'}`}>
                {transaction.transaction_type === 'deposit' || transaction.transaction_type === 'credit' ? '+' : '-'}₹{parseFloat(transaction.amount).toFixed(2)}
              </span>
              <span className="balance-after">₹{parseFloat(transaction.balance_after || 0).toFixed(2)}</span>
              <span className={`transaction-status ${transaction.status || 'completed'}`}>
                {(transaction.status || 'completed').toUpperCase()}
                {transaction.error_code && ` (${transaction.error_code})`}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TransactionHistory;