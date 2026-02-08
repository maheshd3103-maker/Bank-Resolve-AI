import React, { useState, useEffect } from 'react';
import './TransactionMonitoring.css';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';

const TransactionMonitoring = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [chartData, setChartData] = useState([]);
  const [statusData, setStatusData] = useState([]);
  const [typeData, setTypeData] = useState([]);

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/manager/transactions');
      const data = await response.json();
      if (data.success) {
        setTransactions(data.transactions);
        
        // Prepare chart data for transaction trends (last 7 days)
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
          
          const successful = dayTransactions.filter(t => t.status === 'completed' || t.status === 'success').length;
          const failed = dayTransactions.filter(t => t.status === 'failed').length;
          const pending = dayTransactions.filter(t => t.status === 'pending').length;
          const totalAmount = dayTransactions.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
          
          last7Days.push({
            date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            successful,
            failed,
            pending,
            total: dayTransactions.length,
            amount: totalAmount
          });
        }
        setChartData(last7Days);
        
        // Prepare status distribution
        const statusCounts = {};
        data.transactions.forEach(txn => {
          const status = txn.status || 'completed';
          statusCounts[status] = (statusCounts[status] || 0) + 1;
        });
        setStatusData(Object.entries(statusCounts).map(([name, value]) => ({ name, value })));
        
        // Prepare type distribution
        const typeCounts = {};
        data.transactions.forEach(txn => {
          const type = txn.transaction_type || 'other';
          typeCounts[type] = (typeCounts[type] || 0) + 1;
        });
        setTypeData(Object.entries(typeCounts).map(([name, value]) => ({ name, value })));
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = filter === 'all' 
    ? transactions 
    : transactions.filter(t => t.transaction_type === filter);



  return (
    <div className="manager-section">
      <h2>Transaction Monitoring</h2>
      
      <div className="monitoring-controls">
        <div className="filter-buttons">
          <button 
            className={filter === 'all' ? 'active' : ''} 
            onClick={() => setFilter('all')}
          >
            All Transactions
          </button>
          <button 
            className={filter === 'transfer' ? 'active' : ''} 
            onClick={() => setFilter('transfer')}
          >
            Transfers
          </button>
          <button 
            className={filter === 'deposit' ? 'active' : ''} 
            onClick={() => setFilter('deposit')}
          >
            Deposits
          </button>
          <button 
            className={filter === 'failed_transfer' ? 'active' : ''} 
            onClick={() => setFilter('failed_transfer')}
          >
            Failed
          </button>
        </div>
        <div className="monitoring-stats">
          <div className="stat-item">
            <span className="stat-label">Total Transactions:</span>
            <span className="stat-value">{transactions.length}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Failed:</span>
            <span className="stat-value">{transactions.filter(t => t.status === 'failed').length}</span>
          </div>
        </div>
      </div>

      {/* Visualizations Section */}
      {!loading && transactions.length > 0 && (
        <div style={{ marginTop: '30px', marginBottom: '30px', padding: '20px', background: '#f8f9fa', borderRadius: '10px' }}>
          <h3 style={{ marginBottom: '20px', color: '#2c3e50' }}>📊 Transaction Analytics</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px', marginBottom: '20px' }}>
            {/* Transaction Trends */}
            <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              <h4 style={{ marginBottom: '15px', color: '#34495e' }}>Transaction Trends (Last 7 Days)</h4>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="successful" stroke="#2ecc71" strokeWidth={2} name="Successful" />
                  <Line type="monotone" dataKey="failed" stroke="#e74c3c" strokeWidth={2} name="Failed" />
                  <Line type="monotone" dataKey="pending" stroke="#f39c12" strokeWidth={2} name="Pending" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Status Distribution */}
            <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              <h4 style={{ marginBottom: '15px', color: '#34495e' }}>Transaction Status Distribution</h4>
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
                      const COLORS = ['#2ecc71', '#e74c3c', '#f39c12', '#3498db', '#9b59b6'];
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
            {/* Transaction Volume */}
            <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              <h4 style={{ marginBottom: '15px', color: '#34495e' }}>Transaction Volume (Last 7 Days)</h4>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="total" fill="#3498db" name="Total Transactions" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Transaction Types */}
            <div style={{ background: 'white', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              <h4 style={{ marginBottom: '15px', color: '#34495e' }}>Transaction Types</h4>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={typeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#9b59b6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      <div className="transaction-list">
        {loading ? (
          <div>Loading transactions...</div>
        ) : filteredTransactions.length === 0 ? (
          <div className="no-data">No transactions found</div>
        ) : (
          <div className="transactions-table">
            <div className="table-header">
              <span>Transaction ID</span>
              <span>Customer</span>
              <span>Type</span>
              <span>Amount</span>
              <span>Status</span>
              <span>Error Code</span>
              <span>Date</span>
            </div>
            {filteredTransactions.map(transaction => (
              <div key={transaction.id} className="table-row">
                <span className="transaction-id">{transaction.transaction_id}</span>
                <span className="customer-name">{transaction.customer_name}</span>
                <span className="transaction-type">{transaction.transaction_type}</span>
                <span className="amount">₹{transaction.amount}</span>
                <span className={`status ${transaction.status}`}>{transaction.status}</span>
                <span className="error-code">{transaction.error_code || 'N/A'}</span>
                <span>{new Date(transaction.created_at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TransactionMonitoring;