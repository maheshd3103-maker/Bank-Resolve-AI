import React, { useState } from 'react';

const ComplianceReports = () => {
  const [reportType, setReportType] = useState('aml');
  
  const reports = {
    aml: [
      { id: 1, title: 'Monthly AML Report', date: '2024-11-01', status: 'Generated', size: '2.3 MB' },
      { id: 2, title: 'Suspicious Activity Report', date: '2024-11-15', status: 'Pending', size: '1.8 MB' }
    ],
    kyc: [
      { id: 3, title: 'KYC Compliance Summary', date: '2024-11-01', status: 'Generated', size: '1.5 MB' },
      { id: 4, title: 'Document Verification Report', date: '2024-11-10', status: 'Generated', size: '3.2 MB' }
    ],
    regulatory: [
      { id: 5, title: 'Regulatory Filing Report', date: '2024-10-31', status: 'Submitted', size: '4.1 MB' },
      { id: 6, title: 'Risk Assessment Report', date: '2024-11-05', status: 'Generated', size: '2.7 MB' }
    ]
  };

  const generateReport = (type) => {
    console.log('Generating report:', type);
  };

  return (
    <div className="manager-section">
      <h2>Compliance Reports</h2>
      
      <div className="report-controls">
        <div className="report-tabs">
          <button 
            className={reportType === 'aml' ? 'active' : ''} 
            onClick={() => setReportType('aml')}
          >
            AML Reports
          </button>
          <button 
            className={reportType === 'kyc' ? 'active' : ''} 
            onClick={() => setReportType('kyc')}
          >
            KYC Reports
          </button>
          <button 
            className={reportType === 'regulatory' ? 'active' : ''} 
            onClick={() => setReportType('regulatory')}
          >
            Regulatory Reports
          </button>
        </div>
        <button 
          className="generate-report-btn"
          onClick={() => generateReport(reportType)}
        >
          Generate New Report
        </button>
      </div>

      <div className="reports-list">
        {reports[reportType].map(report => (
          <div key={report.id} className="report-card">
            <div className="report-info">
              <h3>{report.title}</h3>
              <div className="report-meta">
                <span>Date: {report.date}</span>
                <span>Size: {report.size}</span>
                <span className={`status ${report.status.toLowerCase()}`}>
                  {report.status}
                </span>
              </div>
            </div>
            <div className="report-actions">
              <button className="download-btn">Download</button>
              <button className="view-btn">View</button>
              <button className="share-btn">Share</button>
            </div>
          </div>
        ))}
      </div>

      <div className="compliance-summary">
        <h3>Compliance Summary</h3>
        <div className="summary-stats">
          <div className="summary-item">
            <span className="summary-label">AML Compliance:</span>
            <span className="summary-value compliant">✓ Compliant</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">KYC Coverage:</span>
            <span className="summary-value">98.5%</span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Risk Score:</span>
            <span className="summary-value low-risk">Low</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComplianceReports;