import React, { useState, useEffect } from 'react';
import './TransactionMonitoring.css';

const TransactionMonitoring = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/manager/transactions');
      const data = await response.json();
      if (data.success) {
        setTransactions(data.transactions);
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