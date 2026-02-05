import React, { useState, useEffect } from 'react';
import { ArrowUpRight, ArrowDownRight, Filter, Download, Search } from 'lucide-react';
import { transactionAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import '../styles/Transactions.css';

const Transactions = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadTransactions();
  }, [user?.id]);

  const loadTransactions = async () => {
    if (!user?.id) return;
    try {
      const response = await transactionAPI.getTransactions(user.id);
      if (response.data.success) {
        setTransactions(response.data.transactions);
      }
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions.filter(txn => {
    const matchesFilter = filter === 'all' || txn.transaction_type === filter;
    const matchesSearch = txn.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          txn.transaction_id?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'completed': return 'badge-success';
      case 'failed': return 'badge-error';
      case 'pending': return 'badge-warning';
      case 'refunded': return 'badge-info';
      default: return 'badge-info';
    }
  };

  return (
    <>
      <Navbar />
      <div className="transactions-container">
        <div className="transactions-content">
          <div className="transactions-header">
            <div>
              <h1 className="page-title">Transaction History</h1>
              <p className="page-subtitle">View all your transaction activity</p>
            </div>
            <button className="btn btn-primary">
              <Download size={18} />
              Export
            </button>
          </div>

          <div className="transactions-filters">
            <div className="search-box">
              <Search size={20} className="search-icon" />
              <input
                type="text"
                placeholder="Search transactions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>

            <div className="filter-buttons">
              <button 
                className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
                onClick={() => setFilter('all')}
              >
                All
              </button>
              <button 
                className={`filter-btn ${filter === 'deposit' ? 'active' : ''}`}
                onClick={() => setFilter('deposit')}
              >
                Deposits
              </button>
              <button 
                className={`filter-btn ${filter === 'transfer' ? 'active' : ''}`}
                onClick={() => setFilter('transfer')}
              >
                Transfers
              </button>
              <button 
                className={`filter-btn ${filter === 'refund' ? 'active' : ''}`}
                onClick={() => setFilter('refund')}
              >
                Refunds
              </button>
            </div>
          </div>

          <div className="card transactions-table-card">
            {loading ? (
              <div className="loading-container">
                <div className="spinner"></div>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">📭</div>
                <p>No transactions found</p>
              </div>
            ) : (
              <div className="transactions-table">
                <div className="table-header">
                  <div className="th">Date</div>
                  <div className="th">Transaction ID</div>
                  <div className="th">Description</div>
                  <div className="th">Type</div>
                  <div className="th">Status</div>
                  <div className="th">Amount</div>
                </div>
                {filteredTransactions.map((txn, index) => (
                  <div key={index} className="table-row">
                    <div className="td">
                      {new Date(txn.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </div>
                    <div className="td">
                      <span className="txn-id">{txn.transaction_id}</span>
                    </div>
                    <div className="td">
                      <span className="txn-desc">{txn.description || 'Transaction'}</span>
                    </div>
                    <div className="td">
                      <div className="type-badge">
                        {txn.transaction_type === 'deposit' && <ArrowDownRight size={14} />}
                        {txn.transaction_type === 'transfer' && <ArrowUpRight size={14} />}
                        {txn.transaction_type === 'refund' && <ArrowDownRight size={14} />}
                        <span>{txn.transaction_type}</span>
                      </div>
                    </div>
                    <div className="td">
                      <span className={`badge ${getStatusBadgeClass(txn.status)}`}>
                        {txn.status}
                      </span>
                    </div>
                    <div className="td">
                      <span className={`amount ${
                        txn.transaction_type === 'deposit' || txn.transaction_type === 'refund' 
                          ? 'positive' : 'negative'
                      }`}>
                        {txn.transaction_type === 'deposit' || txn.transaction_type === 'refund' 
                          ? '+' : '-'}
                        ${Math.abs(parseFloat(txn.amount)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Transactions;

