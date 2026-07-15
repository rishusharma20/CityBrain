import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";

import Login from "./pages/Login";
import DashboardLayout from "./layouts/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Issues from "./pages/Issues";
import MapView from "./pages/Map";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import Notifications from "./pages/Notifications";
import Leaderboard from "./pages/Leaderboard";
import PublicDashboard from "./pages/PublicDashboard";

// Citizen specific pages
import CreateComplaint from "./pages/citizen/CreateComplaint";
import MyComplaints from "./pages/citizen/MyComplaints";

// Officer specific pages
import AssignedComplaints from "./pages/officer/AssignedComplaints";
import OfficerHistory from "./pages/officer/OfficerHistory";

// Admin specific pages
import ManageUsers from "./pages/admin/ManageUsers";
import ManageOfficers from "./pages/admin/ManageOfficers";

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public access routes */}
          <Route path="/" element={<Login />} />
          <Route path="/public" element={<PublicDashboard />} />
          
          {/* Protected layout routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            {/* Dashboard role router */}
            <Route index element={<Dashboard />} />
            
            {/* Citizen paths */}
            <Route
              path="create-complaint"
              element={
                <ProtectedRoute roles={["Citizen"]}>
                  <CreateComplaint />
                </ProtectedRoute>
              }
            />
            <Route
              path="my-complaints"
              element={
                <ProtectedRoute roles={["Citizen"]}>
                  <MyComplaints />
                </ProtectedRoute>
              }
            />

            {/* Officer paths */}
            <Route
              path="assigned-complaints"
              element={
                <ProtectedRoute roles={["Officer", "Admin"]}>
                  <AssignedComplaints />
                </ProtectedRoute>
              }
            />
            <Route
              path="officer-history"
              element={
                <ProtectedRoute roles={["Officer", "Admin"]}>
                  <OfficerHistory />
                </ProtectedRoute>
              }
            />

            {/* Admin paths */}
            <Route
              path="users"
              element={
                <ProtectedRoute roles={["Admin"]}>
                  <ManageUsers />
                </ProtectedRoute>
              }
            />
            <Route
              path="officers"
              element={
                <ProtectedRoute roles={["Admin"]}>
                  <ManageOfficers />
                </ProtectedRoute>
              }
            />

            {/* Shared general components */}
            <Route
              path="issues"
              element={
                <ProtectedRoute roles={["Officer", "Admin"]}>
                  <Issues />
                </ProtectedRoute>
              }
            />
            <Route
              path="map"
              element={
                <ProtectedRoute roles={["Officer", "Admin"]}>
                  <MapView />
                </ProtectedRoute>
              }
            />
            <Route
              path="analytics"
              element={
                <ProtectedRoute roles={["Officer", "Admin"]}>
                  <Analytics />
                </ProtectedRoute>
              }
            />
            <Route path="leaderboard" element={<Leaderboard />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="settings" element={<Settings />} />
          </Route>
          
          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
