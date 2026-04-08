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
import Dashboard from "./pages/client/Dashboard";
import PropertyDetail from "./pages/client/PropertyDetail";
import Profile from "./pages/client/Profile";

// Admin Pages
import AdminDashboard from "./pages/admin/Dashboard";
import AdminLogin from "./pages/admin/AdminLogin";
import ClientList from "./pages/admin/ClientList";
import ClientDetail from "./pages/admin/ClientDetail";
import AdminPropertyDetail from "./pages/admin/AdminPropertyDetail";
import Responses from "./pages/admin/Responses";
import BuyerBriefs from "./pages/admin/BuyerBriefs";

function HostRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    const host = window.location.hostname;

    const isClient = /^(www\.)?clientportal/.test(host);
    const isAdmin = /^(www\.)?admin/.test(host);
    const clientUser = localStorage.getItem(STORAGE_KEYS.CLIENT_USER);
    const adminToken = localStorage.getItem(STORAGE_KEYS.ADMIN_TOKEN);
    if (isClient) {
      if (clientUser) {
        navigate("/client/dashboard", { replace: true });
      } else {
        navigate("/client/login", { replace: true });
      }
    } else if (isAdmin) {
      if (adminToken) {
        navigate("/admin/clients", { replace: true });
      } else {
        navigate("/admin/login", { replace: true });
      }
    } else {
      navigate("/client/login", { replace: true });
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

function App() {
  return (
    <ToastProvider>
      <Router>
        <Routes>
          <Route path="/" element={<HostRedirect />} />
          <Route path="/client/login" element={<Login />} />
          <Route path="/admin/login" element={<AdminLogin />} />

          {/* Client Routes */}
          <Route
            path="/client/dashboard"
            element={
              <ProtectedRoute role="CLIENT">
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/client/property/:id"
            element={
              <ProtectedRoute role="CLIENT">
                <PropertyDetail />
              </ProtectedRoute>
            }
          />

          <Route
            path="/client/profile"
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
            path="/admin/buyers"
            element={
              <ProtectedRoute role="ADMIN">
                <BuyerBriefs />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/buyer-briefs"
            element={<Navigate to="/admin/buyers" replace />}
          />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/client/login" replace />} />
        </Routes>
      </Router>
    </ToastProvider>
  );
}

export default App;
