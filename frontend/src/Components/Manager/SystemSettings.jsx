import React, { useState } from 'react';

const SystemSettings = () => {
  const [settings, setSettings] = useState({
    maxTransactionLimit: 50000,
    kycExpiryDays: 365,
    fraudDetectionEnabled: true,
    autoLoanApproval: false,
    complianceAlerts: true,
    maintenanceMode: false
  });

  const handleSettingChange = (key, value) => {
    setSettings({
      ...settings,
      [key]: value
    });
  };

  const saveSettings = () => {
    console.log('Saving settings:', settings);
  };

  return (
    <div className="manager-section">
      <h2>System Settings</h2>
      
      <div className="settings-sections">
        <div className="settings-group">
          <h3>Transaction Settings</h3>
          <div className="setting-item">
            <label>Maximum Transaction Limit ($)</label>
            <input 
              type="number"
              value={settings.maxTransactionLimit}
              onChange={(e) => handleSettingChange('maxTransactionLimit', parseInt(e.target.value))}
            />
          </div>
          <div className="setting-item">
            <label>
              <input 
                type="checkbox"
                checked={settings.fraudDetectionEnabled}
                onChange={(e) => handleSettingChange('fraudDetectionEnabled', e.target.checked)}
              />
              Enable Fraud Detection
            </label>
          </div>
        </div>

        <div className="settings-group">
          <h3>KYC Settings</h3>
          <div className="setting-item">
            <label>KYC Document Expiry (Days)</label>
            <input 
              type="number"
              value={settings.kycExpiryDays}
              onChange={(e) => handleSettingChange('kycExpiryDays', parseInt(e.target.value))}
            />
          </div>
        </div>

        <div className="settings-group">
          <h3>Loan Settings</h3>
          <div className="setting-item">
            <label>
              <input 
                type="checkbox"
                checked={settings.autoLoanApproval}
                onChange={(e) => handleSettingChange('autoLoanApproval', e.target.checked)}
              />
              Enable Auto Loan Approval (Low Risk)
            </label>
          </div>
        </div>

        <div className="settings-group">
          <h3>System Settings</h3>
          <div className="setting-item">
            <label>
              <input 
                type="checkbox"
                checked={settings.complianceAlerts}
                onChange={(e) => handleSettingChange('complianceAlerts', e.target.checked)}
              />
              Enable Compliance Alerts
            </label>
          </div>
          <div className="setting-item">
            <label>
              <input 
                type="checkbox"
                checked={settings.maintenanceMode}
                onChange={(e) => handleSettingChange('maintenanceMode', e.target.checked)}
              />
              Maintenance Mode
            </label>
          </div>
        </div>
      </div>

      <div className="settings-actions">
        <button className="save-settings-btn" onClick={saveSettings}>
          Save Settings
        </button>
        <button className="reset-settings-btn">
          Reset to Default
        </button>
      </div>

      <div className="system-info">
        <h3>System Information</h3>
        <div className="info-grid">
          <div className="info-item">
            <span>System Version:</span>
            <span>BankSecure AI v2.1.0</span>
          </div>
          <div className="info-item">
            <span>Last Updated:</span>
            <span>2024-11-15</span>
          </div>
          <div className="info-item">
            <span>Database Status:</span>
            <span className="status-online">Online</span>
          </div>
          <div className="info-item">
            <span>AI Engine Status:</span>
            <span className="status-online">Active</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemSettings;