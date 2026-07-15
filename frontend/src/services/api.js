import axios from "axios";

const API_BASE_URL = "http://localhost:8000/api";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to attach JWT token
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling common errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem("token");
      if (window.location.pathname !== "/") {
        window.location.href = "/";
      }
    }
    return Promise.reject(error);
  }
);

export const api = {
  // Authentication Module
  login: (credentials) => apiClient.post("/auth/login", credentials),
  register: (userData) => apiClient.post("/auth/register", userData),
  getProfile: () => apiClient.get("/auth/profile"),
  updateProfile: (profileData) => apiClient.put("/auth/profile", profileData),

  // Complaint Management Module
  createComplaint: (data) => apiClient.post("/complaints", data),
  getComplaints: (params) => apiClient.get("/complaints", { params }),
  getComplaintById: (id) => apiClient.get(`/complaints/${id}`),
  updateComplaint: (id, data) => apiClient.put(`/complaints/${id}`, data),
  deleteComplaint: (id) => apiClient.delete(`/complaints/${id}`),
  getUserComplaints: (params) => apiClient.get("/user/complaints", { params }),
  getDuplicates: (params) => apiClient.get("/complaints/duplicates", { params }),

  // Officer Module
  getOfficerDashboard: () => apiClient.get("/officer/dashboard"),
  getAssignedComplaints: () => apiClient.get("/officer/assigned"),
  getOfficerStatistics: () => apiClient.get("/officer/statistics"),
  getOfficerHistory: () => apiClient.get("/officer/history"),
  getEscalatedComplaints: () => apiClient.get("/officer/escalated"),
  acceptComplaint: (id) => apiClient.put(`/officer/accept/${id}`),
  rejectComplaint: (id, data) => apiClient.put(`/officer/reject/${id}`, data),
  updateOfficerComplaintStatus: (id, data) => apiClient.put(`/officer/status/${id}`, data),
  addOfficerRemarks: (id, data) => apiClient.put(`/officer/remarks/${id}`, data),
  markComplaintCompleted: (id, data) => apiClient.put(`/officer/complete/${id}`, data),

  // Notification Module
  getNotifications: () => apiClient.get("/notifications"),
  getUnreadNotifications: () => apiClient.get("/notifications/unread"),
  markNotificationRead: (id) => apiClient.put(`/notifications/${id}/read`),
  markAllNotificationsRead: () => apiClient.put("/notifications/read-all"),
  deleteNotification: (id) => apiClient.delete(`/notifications/${id}`),
  deleteAllNotifications: () => apiClient.delete("/notifications"),

  // Admin Module
  getAdminDashboard: () => apiClient.get("/admin/dashboard"),
  getAllCitizens: () => apiClient.get("/admin/users"),
  getAllOfficers: () => apiClient.get("/admin/officers"),
  monitorComplaints: (params) => apiClient.get("/admin/complaints", { params }),
  getSystemStatistics: () => apiClient.get("/admin/statistics"),
  monitorDepartmentalPerformance: () => apiClient.get("/admin/performance"),
  toggleBlockUser: (id) => apiClient.put(`/admin/block-user/${id}`),
  assignComplaintToOfficer: (id, officerId) => apiClient.put(`/admin/assign-officer/${id}`, { officerId }),

  // Analytics Module
  getComplaintBreakdown: () => apiClient.get("/analytics/complaints"),
  getOfficerAnalytics: () => apiClient.get("/analytics/officers"),
  getMonthlyTrend: () => apiClient.get("/analytics/monthly"),
  getResponseTimeAnalytics: () => apiClient.get("/analytics/response-time"),
  getDepartmentAnalytics: () => apiClient.get("/analytics/departments"),

  // Heatmaps Module
  getComplaintDensity: () => apiClient.get("/heatmaps/complaint-density"),
  getWardHeatmap: () => apiClient.get("/heatmaps/wards"),
  getHotspots: () => apiClient.get("/heatmaps/hotspots"),

  // Leaderboards Module
  getTopOfficers: () => apiClient.get("/leaderboards/officers"),
  getTopWards: () => apiClient.get("/leaderboards/wards"),
  getBestDepartments: () => apiClient.get("/leaderboards/departments"),

  // Public Dashboard Module
  getPublicResolvedCount: () => apiClient.get("/public/resolved"),
  getPublicPendingCount: () => apiClient.get("/public/pending"),
  getPublicWardStats: () => apiClient.get("/public/ward-stats"),
  getPublicTransparencyReport: () => apiClient.get("/public/transparency-report"),
};

export default apiClient;
