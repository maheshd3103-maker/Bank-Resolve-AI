import React, { useState, useEffect } from 'react';
import { ArrowRight, DollarSign, User, Building2, AlertCircle, CheckCircle } from 'lucide-react';
import { transactionAPI, profileAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import '../styles/Transfer.css';

const Transfer = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [formData, setFormData] = useState({
    receiverAccount: '',
    receiverName: '',
    amount: '',
  });
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [accountValidated, setAccountValidated] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadProfile();
  }, [user?.id]);

  const loadProfile = async () => {
    if (!user?.id) return;
    try {
      const response = await profileAPI.getProfile(user.id);
      if (response.data.success) {
        setProfile(response.data.profile);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setError('');
    setResult(null);
    if (name === 'receiverAccount') {
      setAccountValidated(false);
    }
  };

  const validateAccount = async () => {
    if (!formData.receiverAccount) {
      setError('Please enter account number');
      return;
    }

    setValidating(true);
    setError('');

    try {
      const response = await transactionAPI.validateAccount({
        account_number: formData.receiverAccount,
      });

      if (response.data.success) {
        setFormData({ ...formData, receiverName: response.data.account_holder_name });
        setAccountValidated(true);
      } else {
        setError(response.data.message || 'Account validation failed');
        setAccountValidated(false);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to validate account');
      setAccountValidated(false);
    } finally {
      setValidating(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await transactionAPI.transfer({
        user_id: user.id,
        receiverAccount: formData.receiverAccount,
        receiverName: formData.receiverName,
        amount: parseFloat(formData.amount),
      });

      setResult(response.data);

      if (response.data.success) {
        // Reset form on success
        setTimeout(() => {
          setFormData({
            receiverAccount: '',
            receiverName: '',
            amount: '',
          });
          setAccountValidated(false);
          loadProfile(); // Reload balance
        }, 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Transfer failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <div className="transfer-container">
        <div className="transfer-content">
          <div className="transfer-header">
            <h1 className="page-title">Transfer Money</h1>
            <p className="page-subtitle">Send money securely to any account</p>
          </div>

          <div className="transfer-grid">
            {/* Transfer Form */}
            <div className="card transfer-form-card">
              <h2 className="section-title">Transfer Details</h2>

              {/* Current Balance */}
              <div className="balance-display">
                <div className="balance-label">Available Balance</div>
                <div className="balance-value">
                  ${parseFloat(profile?.balance || 0).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </div>
              </div>

              <form onSubmit={handleSubmit} className="transfer-form">
                <div className="form-group">
                  <label className="form-label">Receiver Account Number</label>
                  <div className="input-with-button">
                    <div className="input-with-icon">
                      <Building2 size={20} className="input-icon" />
                      <input
                        type="text"
                        name="receiverAccount"
                        value={formData.receiverAccount}
                        onChange={handleChange}
                        placeholder="Enter account number"
                        required
                        className="input-field"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={validateAccount}
                      disabled={validating || !formData.receiverAccount}
                      className="btn btn-secondary validate-btn"
                    >
                      {validating ? 'Validating...' : 'Validate'}
                    </button>
                  </div>
                  {accountValidated && (
                    <div className="validation-success">
                      <CheckCircle size={16} />
                      Account validated successfully
                    </div>
                  )}
                </div>

                {accountValidated && (
                  <div className="form-group">
                    <label className="form-label">Receiver Name</label>
                    <div className="input-with-icon">
                      <User size={20} className="input-icon" />
                      <input
                        type="text"
                        name="receiverName"
                        value={formData.receiverName}
                        readOnly
                        className="input-field"
                      />
                    </div>
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Amount ($)</label>
                  <div className="input-with-icon">
                    <DollarSign size={20} className="input-icon" />
                    <input
                      type="number"
                      name="amount"
                      value={formData.amount}
                      onChange={handleChange}
                      placeholder="Enter amount"
                      min="0.01"
                      step="0.01"
                      required
                      className="input-field"
                    />
                  </div>
                </div>

                {error && (
                  <div className="alert alert-error">
                    <AlertCircle size={20} />
                    <span>{error}</span>
                  </div>
                )}

                {result && !result.success && (
                  <div className="alert alert-error">
                    <AlertCircle size={20} />
                    <div>
                      <strong>{result.status}</strong>
                      <p>{result.message}</p>
                      {result.requires_complaint && (
                        <button 
                          className="btn btn-sm btn-outline mt-2"
                          onClick={() => window.location.href = '/complaints'}
                        >
                          File a Complaint
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {result && result.success && (
                  <div className="alert alert-success">
                    <CheckCircle size={20} />
                    <div>
                      <strong>Transfer Successful!</strong>
                      <p>Transaction ID: {result.transaction_id}</p>
                      <p>Amount: ${result.amount}</p>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className="btn btn-primary btn-block"
                  disabled={loading || !accountValidated}
                >
                  {loading ? (
                    <>
                      <div className="spinner-small"></div>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <ArrowRight size={20} />
                      <span>Transfer Now</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Recent Transfers */}
            <div className="card recent-transfers-card">
              <h2 className="section-title">Recent Transfers</h2>
              <div className="recent-transfers-list">
                <div className="empty-state">
                  <div className="empty-icon">📤</div>
                  <p>No recent transfers</p>
                </div>
              </div>
            </div>
          </div>

          {/* Information Cards */}
          <div className="info-cards-grid">
            <div className="info-card">
              <div className="info-icon">⚡</div>
              <h3>Instant Transfer</h3>
              <p>Money reaches recipient account instantly</p>
            </div>
            <div className="info-card">
              <div className="info-icon">🔒</div>
              <h3>Secure & Safe</h3>
              <p>Bank-grade encryption for all transactions</p>
            </div>
            <div className="info-card">
              <div className="info-icon">🤖</div>
              <h3>AI-Powered</h3>
              <p>Smart fraud detection and complaint resolution</p>
            </div>
            <div className="info-card">
              <div className="info-icon">📱</div>
              <h3>24/7 Support</h3>
              <p>AI assistant available anytime you need help</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Transfer;

