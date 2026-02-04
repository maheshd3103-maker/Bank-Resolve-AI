import React, { useState, useEffect } from 'react';
import './ComplianceReports.css';

const ComplianceReports = () => {
  const [reportType, setReportType] = useState('complaints');
  const [complaints, setComplaints] = useState([]);

  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState({
    totalComplaints: 0,
    aiResolved: 0,
    manualReview: 0,
    errorCodes: {}
  });
  
  useEffect(() => {
    fetchComplaints();
    if (reportType === 'manual-review') {
      fetchManualReviews();
    }
  }, [reportType]);

  const [manualReviews, setManualReviews] = useState([]);

  const fetchComplaints = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/manager/complaints');
      const data = await response.json();
      if (data.success) {
        setComplaints(data.complaints);
        calculateAnalytics(data.complaints);
      }
    } catch (error) {
      console.error('Error fetching complaints:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchManualReviews = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/manager/manual-review');
      const data = await response.json();
      if (data.success) {
        setManualReviews(data.manual_reviews);
      }
    } catch (error) {
      console.error('Error fetching manual reviews:', error);
    }
  };

  const processRefund = async (complaintId) => {
    try {
      const response = await fetch('http://localhost:5000/api/manager/refund', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ complaint_id: complaintId })
      });
      const data = await response.json();
      if (data.success) {
        alert(data.message);
        fetchManualReviews();
        fetchComplaints();
      } else {
        alert('Error: ' + data.message);
      }
    } catch (error) {
      console.error('Error processing refund:', error);
      alert('Error processing refund');
    }
  };

  const calculateAnalytics = (complaintsData) => {
    const total = complaintsData.length;
    const resolved = complaintsData.filter(c => c.status === 'resolved').length;
    const escalated = complaintsData.filter(c => c.status === 'escalated').length;
    
    // Count error codes
    const errorCounts = {};
    complaintsData.forEach(c => {
      if (c.error_code) {
        errorCounts[c.error_code] = (errorCounts[c.error_code] || 0) + 1;
      }
    });
    
    setAnalytics({
      totalComplaints: total,
      aiResolved: resolved,
      manualReview: escalated,
      errorCodes: errorCounts
    });
  };
  
  const reports = {
    analysis: [
      { id: 1, title: 'Transaction Pattern Analysis', date: '2024-11-01', status: 'Generated', size: '2.3 MB' },
      { id: 2, title: 'Error Code Trend Analysis', date: '2024-11-15', status: 'Pending', size: '1.8 MB' }
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
            className={reportType === 'complaints' ? 'active' : ''} 
            onClick={() => setReportType('complaints')}
          >
            Customer Complaints
          </button>
          <button 
            className={reportType === 'manual-review' ? 'active' : ''} 
            onClick={() => setReportType('manual-review')}
          >
            Manual Review
          </button>
          <button 
            className={reportType === 'analysis' ? 'active' : ''} 
            onClick={() => setReportType('analysis')}
          >
            Analysis
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
        {reportType === 'complaints' ? (
          loading ? (
            <div>Loading complaints...</div>
          ) : (
            <div className="complaints-table">
              <div className="table-header">
                <span>Complaint ID</span>
                <span>Customer</span>
                <span>Issue</span>
                <span>Amount</span>
                <span>Status</span>
                <span>Priority</span>
                <span>Date</span>
              </div>
              {complaints.map(complaint => (
                <div key={complaint.complaint_id} className="table-row">
                  <span className="complaint-id">{complaint.complaint_id}</span>
                  <span className="customer-info">
                    <div>{complaint.customer_name}</div>
                    <div className="customer-email">{complaint.customer_email}</div>
                  </span>
                  <span className="issue-desc">{complaint.issue_description}</span>
                  <span className="amount">₹{complaint.amount || 'N/A'}</span>
                  <span className={`status ${complaint.status}`}>{complaint.status}</span>
                  <span className={`priority ${complaint.priority}`}>{complaint.priority}</span>
                  <span>{new Date(complaint.created_at).toLocaleDateString()}</span>
                </div>
              ))}
            </div>
          )
        ) : reportType === 'manual-review' ? (
          <div className="manual-review-section">
            <h3>Transactions Requiring Manual Review</h3>
            {manualReviews.length === 0 ? (
              <div className="no-reviews">No transactions require manual review at this time.</div>
            ) : (
              <div className="manual-review-table">
                <div className="table-header">
                  <span>Complaint ID</span>
                  <span>Customer</span>
                  <span>Transaction ID</span>
                  <span>Error Code</span>
                  <span>Amount</span>
                  <span>Issue</span>
                  <span>Date</span>
                  <span>Action</span>
                </div>
                {manualReviews.map(review => (
                  <div key={review.complaint_id} className="table-row">
                    <span className="complaint-id">{review.complaint_id}</span>
                    <span className="customer-name">{review.customer_name}</span>
                    <span className="transaction-id">{review.transaction_id}</span>
                    <span className="error-code">{review.error_code}</span>
                    <span className="amount">₹{review.amount}</span>
                    <span className="issue-desc">{review.issue_description}</span>
                    <span>{new Date(review.created_at).toLocaleDateString()}</span>
                    <span className="action-buttons">
                      <button 
                        className="refund-btn"
                        onClick={() => processRefund(review.complaint_id)}
                      >
                        Refund Initiated
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : reportType === 'analysis' ? (
          <div className="analysis-dashboard">
            <div className="analytics-grid">
              <div className="chart-card">
                <h3>Complaint Resolution</h3>
                <div className="pie-chart">
                  <div className="chart-legend">
                    <div className="legend-item">
                      <span className="legend-color ai"></span>
                      <span>AI Resolved ({analytics.totalComplaints > 0 ? Math.round((analytics.aiResolved / analytics.totalComplaints) * 100) : 0}%)</span>
                    </div>
                    <div className="legend-item">
                      <span className="legend-color manual"></span>
                      <span>Manual Review ({analytics.totalComplaints > 0 ? Math.round((analytics.manualReview / analytics.totalComplaints) * 100) : 0}%)</span>
                    </div>
                  </div>
                  <div className="pie-visual">
                    <div className="pie-slice ai" style={{transform: 'rotate(0deg)'}}></div>
                    <div className="pie-slice manual" style={{transform: `rotate(${analytics.totalComplaints > 0 ? (analytics.aiResolved / analytics.totalComplaints) * 360 : 0}deg)`}}></div>
                  </div>
                </div>
              </div>
              
              <div className="chart-card">
                <h3>Error Code Distribution</h3>
                <div className="bar-chart">
                  {Object.entries(analytics.errorCodes)
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 4)
                    .map(([code, count], index) => {
                      const maxCount = Math.max(...Object.values(analytics.errorCodes));
                      const height = maxCount > 0 ? (count / maxCount) * 100 : 0;
                      const percentage = analytics.totalComplaints > 0 ? Math.round((count / analytics.totalComplaints) * 100) : 0;
                      return (
                        <div key={code} className="bar" style={{height: `${height}%`}}>
                          <span className="bar-label">{code}</span>
                          <span className="bar-value">{percentage}%</span>
                        </div>
                      );
                    })
                  }
                </div>
              </div>
              
              <div className="stats-card">
                <h3>Quick Stats</h3>
                <div className="stats-grid">
                  <div className="stat-item">
                    <span className="stat-number">{analytics.totalComplaints}</span>
                    <span className="stat-label">Total Complaints</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-number">{analytics.aiResolved}</span>
                    <span className="stat-label">AI Resolved</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-number">{analytics.manualReview}</span>
                    <span className="stat-label">Manual Review</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-number">{analytics.totalComplaints - analytics.aiResolved - analytics.manualReview}</span>
                    <span className="stat-label">Processing</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          reports[reportType].map(report => (
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
          ))
        )}
      </div>


    </div>
  );
};

export default ComplianceReports;