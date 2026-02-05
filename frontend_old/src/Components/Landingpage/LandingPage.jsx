import React, { useState, useEffect } from 'react';
import Login from '../Login/Login';
import Signup from '../Login/Signup';
import Dashboard from '../Customer/Dashboard';
import ManagerDashboard from '../Manager/ManagerDashboard';

const LandingPage = () => {
  const [showLogin, setShowLogin] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const userId = localStorage.getItem('user_id');
    const userRole = localStorage.getItem('user_role');
    if (userId) {
      setIsLoggedIn(true);
    }
  }, []);

  if (isLoggedIn) {
    const userRole = localStorage.getItem('user_role');
    if (userRole === 'manager') {
      return <ManagerDashboard />;
    }
    return <Dashboard />;
  }
  
  const coreFeatures = [
    { title: 'Create Account', icon: '👤', desc: 'Instant AI-powered account setup' },
    { title: 'Manage Accounts', icon: '💼', desc: 'Smart portfolio management' },
    { title: 'Money Transfer', icon: '💸', desc: 'Secure instant transfers' },
    { title: 'Transaction History', icon: '📊', desc: 'AI-analyzed spending insights' },
    { title: 'Loan Application', icon: '🏦', desc: 'Smart loan processing' },
    { title: 'Loan Status', icon: '📈', desc: 'Real-time loan tracking' }
  ];

  const aiFeatures = [
    { title: 'AI Voice Banking', icon: '🎤', desc: 'Voice-powered transactions' },
    { title: 'Smart Chat Agent', icon: '🤖', desc: '24/7 AI banking assistant' },
    { title: 'Compliance Agent', icon: '⚖️', desc: 'Automated compliance checks' },
    { title: 'Anti-Fraud Agent', icon: '🛡️', desc: 'Real-time fraud detection' },
    { title: 'Image KYC', icon: '📷', desc: 'Instant identity verification' },
    { title: 'Smart Insights', icon: '🧠', desc: 'Predictive financial analytics' }
  ];

  const complianceFeatures = [
    { title: 'KYC Verification', icon: '✅', desc: 'Automated identity checks' },
    { title: 'AML Monitoring', icon: '🔍', desc: 'Anti-money laundering AI' },
    { title: 'Risk Scoring', icon: '⚡', desc: 'Dynamic risk assessment' },
    { title: 'Regulatory Alerts', icon: '🚨', desc: 'Compliance notifications' },
    { title: 'Document Analyzer', icon: '📄', desc: 'AI document processing' }
  ];

  const featuredCapabilities = [
    { title: 'Agentic AI Banking', desc: 'Autonomous agents handle complex banking tasks', bg: 'linear-gradient(135deg, #00d4ff, #0099cc)' },
    { title: 'Smart Compliance', desc: 'AI-driven regulatory compliance automation', bg: 'linear-gradient(135deg, #00ffaa, #00cc88)' },
    { title: 'Fraud Prevention', desc: 'Real-time AI fraud detection and prevention', bg: 'linear-gradient(135deg, #ff6b6b, #cc5555)' },
    { title: 'Voice Banking', desc: 'Natural language banking interactions', bg: 'linear-gradient(135deg, #a855f7, #8b5cf6)' }
  ];

  return (
    <div className="landing-page">
      {/* Auth Buttons */}
      <div className="auth-buttons">
        <button className="auth-nav-btn" onClick={() => setShowLogin(true)}>Login</button>
        <button className="auth-nav-btn" onClick={() => setShowSignup(true)}>Sign Up</button>
      </div>
      
      {/* Hero Banner */}
      <section className="hero-banner">
        <div className="hero-content">
          <h1 className="hero-title">Smarter Banking. Powered by Agentic AI.</h1>
          <p className="hero-subtitle">
            Create accounts, manage money, transfer funds, and stay compliant with AI-driven automation.
          </p>
          <div className="hero-buttons">
            <button className="btn-primary" onClick={() => setShowSignup(true)}>Get Started</button>
            <button className="btn-secondary" onClick={() => setShowLogin(true)}>Banking Demo</button>
          </div>
        </div>
        <div className="hero-bg"></div>
      </section>

      {/* Core Banking Features */}
      <section className="features-section">
        <h2 className="section-title">Core Banking</h2>
        <div className="carousel-container">
          <div className="feature-carousel">
            {coreFeatures.map((feature, index) => (
              <div key={index} className="feature-card">
                <div className="card-icon">{feature.icon}</div>
                <h3>{feature.title}</h3>
                <p>{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI & Agentic Features */}
      <section className="features-section">
        <h2 className="section-title">AI & Agentic Features</h2>
        <div className="carousel-container">
          <div className="feature-carousel">
            {aiFeatures.map((feature, index) => (
              <div key={index} className="feature-card">
                <div className="card-icon">{feature.icon}</div>
                <h3>{feature.title}</h3>
                <p>{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Compliance & Security */}
      <section className="features-section">
        <h2 className="section-title">Compliance & Security</h2>
        <div className="carousel-container">
          <div className="feature-carousel">
            {complianceFeatures.map((feature, index) => (
              <div key={index} className="feature-card">
                <div className="card-icon">{feature.icon}</div>
                <h3>{feature.title}</h3>
                <p>{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Section */}
      <section className="featured-section">
        <h2 className="section-title">Featured Capabilities</h2>
        <div className="featured-grid">
          {featuredCapabilities.map((capability, index) => (
            <div key={index} className="featured-card" style={{ background: capability.bg }}>
              <h3>{capability.title}</h3>
              <p>{capability.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* App Preview */}
      <section className="app-preview-section">
        <h2 className="section-title">Experience BankSecure AI</h2>
        <div className="preview-container">
          <div className="preview-card">
            <div className="preview-screen">
              <div className="screen-header">Dashboard</div>
              <div className="screen-content">
                <div className="balance-card">$25,847.32</div>

              </div>
            </div>
          </div>
          <div className="preview-card">
            <div className="preview-screen">
              <div className="screen-header">AI Assistant</div>
              <div className="screen-content">
                <div className="chat-bubble">How can I help you today?</div>
                <div className="chat-input">Transfer $500 to John</div>
              </div>
            </div>
          </div>
          <div className="preview-card">
            <div className="preview-screen">
              <div className="screen-header">KYC Verification</div>
              <div className="screen-content">
                <div className="kyc-status">✅ Verified</div>
                <div className="kyc-info">Identity confirmed via AI</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="cta-section">
        <div className="cta-card">
          <h2>Experience the Future of Banking</h2>
          <p>Join thousands of users already banking with AI</p>
          <button className="cta-button" onClick={() => setShowLogin(true)}>Launch App</button>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-links">
            <a href="#about">About</a>
            <a href="#contact">Contact</a>
            <a href="#terms">Terms</a>
            <a href="#privacy">Privacy</a>
            <a href="#docs">Docs</a>
            <a href="#github">GitHub</a>
          </div>
          <div className="footer-social">
            <span>🐦</span>
            <span>📘</span>
            <span>💼</span>
          </div>
        </div>
        <div className="footer-bottom">
          <p>&copy; 2024 BankSecure AI. All rights reserved.</p>
        </div>
      </footer>

      {/* Modals */}
      {showLogin && (
        <Login 
          onClose={() => setShowLogin(false)}
          switchToSignup={() => {
            setShowLogin(false);
            setShowSignup(true);
          }}
        />
      )}
      {showSignup && (
        <Signup 
          onClose={() => setShowSignup(false)}
          switchToLogin={() => {
            setShowSignup(false);
            setShowLogin(true);
          }}
        />
      )}
    </div>
  );
};

export default LandingPage;