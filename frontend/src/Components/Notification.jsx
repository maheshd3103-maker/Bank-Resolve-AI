import React from 'react';
import './notification.css';

const Notification = ({ message, type = 'success', onClose, showLoginButton, onLogin }) => {
  return (
    <div className="notification-overlay">
      <div className={`notification-box ${type}`}>
        <div className="notification-icon">
          {type === 'success' && '✅'}
          {type === 'error' && '❌'}
          {type === 'info' && 'ℹ️'}
        </div>
        <div className="notification-content">
          <div className="notification-message">{message}</div>
          {showLoginButton && (
            <button className="login-redirect-btn" onClick={onLogin}>
              Go to Login
            </button>
          )}
        </div>
        <button className="notification-close" onClick={onClose}>×</button>
      </div>
    </div>
  );
};

export default Notification;