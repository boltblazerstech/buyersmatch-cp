import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { ToastProvider } from './components/Toast';
import { STORAGE_KEYS } from './api/http';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Dashboard from './pages/client/Dashboard';
import PropertyDetail from './pages/client/PropertyDetail';
import Profile from './pages/client/Profile';

// Admin Pages
import AdminDashboard from './pages/admin/Dashboard';
import AdminLogin from './pages/admin/AdminLogin';
import ClientList from './pages/admin/ClientList';
import ClientDetail from './pages/admin/ClientDetail';
import AdminPropertyDetail from './pages/admin/AdminPropertyDetail';
import Responses from './pages/admin/Responses';
import BuyerBriefs from './pages/admin/BuyerBriefs';

function HostRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    const host = window.location.hostname;
    const isClient = host.startsWith('clientportal');
    const isAdmin = host.startsWith('admin');
    const clientUser = localStorage.getItem(STORAGE_KEYS.CLIENT_USER);
    const adminToken = localStorage.getItem(STORAGE_KEYS.ADMIN_TOKEN);
    if (isClient) {
      if (clientUser) {
        navigate('/client/dashboard', { replace: true });
      } else {
        navigate('/client/login', { replace: true });
      }
    } else if (isAdmin) {
      if (adminToken) {
        navigate('/admin/clients', { replace: true });
      } else {
        navigate('/admin/login', { replace: true });
      }
    } else {
      navigate('/client/login', { replace: true });
    }
  }, [navigate]);
  return null;
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

        <Route path="/admin/buyer-briefs" element={<Navigate to="/admin/buyers" replace />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/client/login" replace />} />
      </Routes>
    </Router>
    </ToastProvider>
  );
}

export default App;
