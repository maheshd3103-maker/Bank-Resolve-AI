import React, { useState, useEffect } from 'react';

const TransactionHistory = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

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
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    } finally {
      setLoading(false);
    }
  };

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
      <h2>Transaction History</h2>
      
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
          <span>Amount</span>
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
              <span className={`transaction-amount ${transaction.transaction_type === 'deposit' ? 'credit' : 'debit'}`}>
                {transaction.transaction_type === 'deposit' ? '+' : '-'}₹{parseFloat(transaction.amount).toFixed(2)}
              </span>
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