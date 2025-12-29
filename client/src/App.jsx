import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import LoginPage from "./pages/LoginPage";
import AdminDashboard from "./pages/AdminDashboard";
import HomePage from "./pages/HomePage";
import HostsPage from "./pages/HostsPage";
import PatchesPage from "./pages/PatchesPage";
import LogsPage from "./pages/LogsPage";
import PatchInstallLogsPage from "./pages/PatchInstallLogsPage";
import SchedulerPage from "./pages/SchedulerPage";
import GroupsPage from "./pages/GroupsPage";
import ProtectedRoute from "./utils/ProtectedRoute";
import "./App.css";

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/hosts"
          element={
            <ProtectedRoute allowedRole="admin">
              <HostsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/patches"
          element={
            <ProtectedRoute allowedRole="admin">
              <PatchesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/logs"
          element={
            <ProtectedRoute allowedRole="admin">
              <LogsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/groups"
          element={
            <ProtectedRoute allowedRole="admin">
              <GroupsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/scheduler"
          element={
            <ProtectedRoute allowedRole="admin">
              <SchedulerPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/patch-install-logs"
          element={
            <ProtectedRoute allowedRole="admin">
              <PatchInstallLogsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/home"
          element={
            <ProtectedRoute allowedRole="user">
              <HomePage />
            </ProtectedRoute>
          }
        />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
