import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auth APIs
export const authAPI = {
  signup: (data) => api.post('/signup', data),
  login: (data) => api.post('/login', data),
};

// Profile APIs
export const profileAPI = {
  getProfile: (userId) => api.get(`/profile/${userId}`),
  updateProfile: (userId, data) => api.put(`/profile/${userId}`, data),
  uploadPhoto: (userId, formData) => 
    api.post(`/profile/${userId}/photo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
};

// KYC APIs
export const kycAPI = {
  submitKYC: (formData) => 
    api.post('/kyc/submit', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  getKYCStatus: (userId) => api.get(`/kyc-status/${userId}`),
  getKYCDocuments: (userId) => api.get(`/kyc-documents/${userId}`),
};

// Transaction APIs
export const transactionAPI = {
  getTransactions: (userId) => api.get(`/transactions/${userId}`),
  deposit: (data) => api.post('/deposit', data),
  transfer: (data) => api.post('/transfer', data),
  validateAccount: (data) => api.post('/validate-account', data),
};

// Complaint APIs
export const complaintAPI = {
  submitComplaint: (data) => api.post('/complaint', data),
  getUserComplaints: (userId) => api.get(`/complaints/${userId}`),
  trackComplaint: (complaintId) => api.get(`/complaints/${complaintId}/track`),
  processComplaint: (complaintId) => api.post(`/complaints/process/${complaintId}`),
};

// Chatbot API
export const chatAPI = {
  sendMessage: (data) => api.post('/chat', data),
};

// Manager APIs
export const managerAPI = {
  getUsers: () => api.get('/manager/users'),
  getUserDetails: (userId) => api.get(`/manager/user/${userId}`),
  getTransactions: () => api.get('/manager/transactions'),
  getKYCApplications: () => api.get('/manager/kyc-applications'),
  approveKYC: (data) => api.post('/manager/kyc-approve', data),
  rejectKYC: (data) => api.post('/manager/kyc-reject', data),
  getComplaints: () => api.get('/manager/complaints'),
  resolveComplaint: (data) => api.post(`/manager/complaints/${data.complaint_id}/resolve`, data),
};

// External Accounts APIs
export const externalAccountsAPI = {
  getAccounts: () => api.get('/external-accounts'),
  seedAccounts: () => api.post('/external-accounts/seed'),
};

export default api;

