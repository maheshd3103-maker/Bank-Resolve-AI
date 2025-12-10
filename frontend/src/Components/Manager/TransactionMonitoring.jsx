import React, { useState } from 'react';

const TransactionMonitoring = () => {
  const [flaggedTransactions, setFlaggedTransactions] = useState([]);

  const [filter, setFilter] = useState('all');

  const filteredTransactions = filter === 'all' 
    ? flaggedTransactions 
    : flaggedTransactions.filter(t => t.riskLevel.toLowerCase() === filter);

  const handleApproveTransaction = (id) => {
    console.log('Approving transaction:', id);
  };

  const handleBlockTransaction = (id) => {
    console.log('Blocking transaction:', id);
  };

  return (
    <div className="manager-section">
      <h2>Transaction Monitoring</h2>
      
      <div className="monitoring-controls">
        <div className="filter-buttons">
          <button 
            className={filter === 'all' ? 'active' : ''} 
            onClick={() => setFilter('all')}
          >
            All Flagged
          </button>
          <button 
            className={filter === 'high' ? 'active' : ''} 
            onClick={() => setFilter('high')}
          >
            High Risk
          </button>
          <button 
            className={filter === 'medium' ? 'active' : ''} 
            onClick={() => setFilter('medium')}
          >
            Medium Risk
          </button>
        </div>
        <div className="monitoring-stats">
          <div className="stat-item">
            <span className="stat-label">Total Flagged:</span>
            <span className="stat-value">0</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">High Risk:</span>
            <span className="stat-value">0</span>
          </div>
        </div>
      </div>

      <div className="transaction-list">
        {filteredTransactions.length === 0 ? (
          <div className="no-data">No flagged transactions</div>
        ) : (
          filteredTransactions.map(transaction => (
          <div key={transaction.id} className="transaction-card">
            <div className="transaction-header">
              <h3>{transaction.userName}</h3>
              <span className={`risk-level ${transaction.riskLevel.toLowerCase()}`}>
                {transaction.riskLevel} Risk
              </span>
            </div>
            <div className="transaction-details">
              <div className="detail-row">
                <span><strong>Amount:</strong> {transaction.amount}</span>
                <span><strong>Type:</strong> {transaction.type}</span>
              </div>
              <div className="detail-row">
                <span><strong>Reason:</strong> {transaction.reason}</span>
                <span><strong>Time:</strong> {transaction.timestamp}</span>
              </div>
            </div>
            <div className="transaction-actions">
              <button className="investigate-btn">Investigate</button>
              <button className="approve-btn" onClick={() => handleApproveTransaction(transaction.id)}>
                Approve
              </button>
              <button className="block-btn" onClick={() => handleBlockTransaction(transaction.id)}>
                Block
              </button>
            </div>
          </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TransactionMonitoring;