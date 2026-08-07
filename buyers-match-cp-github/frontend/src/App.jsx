import React, { useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import { ToastProvider } from "./components/Toast";
import { STORAGE_KEYS } from "./api/http";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import SetPassword from "./pages/SetPassword";
import Dashboard from "./pages/client/Dashboard";
import PropertyDetail from "./pages/client/PropertyDetail";
import Profile from "./pages/client/Profile";

// Admin Pages
import AdminDashboard from "./pages/admin/Dashboard";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminForgotPassword from "./pages/admin/AdminForgotPassword";
import AdminResetPassword from "./pages/admin/AdminResetPassword";
import ClientList from "./pages/admin/ClientList";
import ClientDetail from "./pages/admin/ClientDetail";
import AdminPropertyDetail from "./pages/admin/AdminPropertyDetail";
import Responses from "./pages/admin/Responses";
import SuperAdminDashboard from "./pages/admin/SuperAdminDashboard";
import SuperAdminLogin from "./pages/admin/SuperAdminLogin";

function HostRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    const host = window.location.hostname;

    const isClient = /^(www\.)?clientportal/.test(host);
    const isAdmin = /^(www\.)?admin/.test(host);
    const isAdminPath = window.location.pathname.startsWith("/admin");
    const clientUser = localStorage.getItem(STORAGE_KEYS.CLIENT_USER);
    const adminToken = localStorage.getItem(STORAGE_KEYS.ADMIN_TOKEN);
    if (isAdmin || isAdminPath) {
      if (adminToken) {
        navigate("/admin/clients", { replace: true });
      } else {
        navigate("/admin/login", { replace: true });
      }
    } else if (isClient) {
      if (clientUser) {
        navigate("/dashboard", { replace: true });
      } else {
        navigate("/login", { replace: true });
      }
    } else {
      navigate("/login", { replace: true });
    }
  }, [navigate]);
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0A1128] text-white">
      <svg
        className="animate-spin h-8 w-8 mb-4 text-teal-400"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        ></circle>
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8v8H4z"
        ></path>
      </svg>
      <p className="text-lg font-medium">Redirecting…</p>
    </div>
  );
}

function Fallback() {
  const path = window.location.pathname;
  if (path.startsWith("/super-admin")) {
    return <Navigate to="/super-admin/login" replace />;
  }
  if (path.startsWith("/admin")) {
    return <Navigate to="/admin/login" replace />;
  }
  return <Navigate to="/login" replace />;
}

function App() {
  return (
    <ToastProvider>
      <Router>
        <Routes>
          <Route path="/" element={<HostRedirect />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/set-password" element={<SetPassword />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/forgot-password" element={<AdminForgotPassword />} />
          <Route path="/admin/reset-password" element={<AdminResetPassword />} />

          {/* Client Routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute role="CLIENT">
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/property/:id"
            element={
              <ProtectedRoute role="CLIENT">
                <PropertyDetail />
              </ProtectedRoute>
            }
          />

          <Route
            path="/profile"
            element={
              <ProtectedRoute role="CLIENT">
                <Profile />
              </ProtectedRoute>
            }
          />

          {/* Admin Routes */}
          <Route
            path="/admin/dashboard"
            element={<Navigate to="/admin/clients" replace />}
          />

          <Route
            path="/admin/clients"
            element={
              <ProtectedRoute role="ADMIN">
                <ClientList />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/client/:id"
            element={
              <ProtectedRoute role="ADMIN">
                <ClientDetail />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/client/:clientId/property/:propertyId"
            element={
              <ProtectedRoute role="ADMIN">
                <AdminPropertyDetail />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/responses"
            element={
              <ProtectedRoute role="ADMIN">
                <Responses />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/buyer-briefs"
            element={<Navigate to="/admin/buyers" replace />}
          />

          <Route
            path="/super-admin/login"
            element={<SuperAdminLogin />}
          />

          <Route
            path="/super-admin/dashboard"
            element={<Navigate to="/super-admin/clients" replace />}
          />

          <Route
            path="/super-admin/clients"
            element={
              <ProtectedRoute role="SUPER_ADMIN">
                <SuperAdminDashboard />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="/super-admin"
            element={<Navigate to="/super-admin/clients" replace />}
          />

          {/* Fallback */}
          <Route path="*" element={<Fallback />} />
        </Routes>
      </Router>
    </ToastProvider>
  );
}

export default App;
