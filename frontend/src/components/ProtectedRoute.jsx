import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, role }) => {
  const isClient = role === 'CLIENT';
  const isAdmin = role === 'ADMIN';

  // Specific storage check based on required role
  const userStr = localStorage.getItem(isAdmin ? 'bm_admin_user' : 'bm_client_user');

  if (!userStr) {
    return <Navigate to={isAdmin ? "/admin/login" : "/login"} replace />;
  }

  const user = JSON.parse(userStr);
  const userRole = user.role?.toUpperCase();
  const requiredRole = role?.toUpperCase();

  if (requiredRole && userRole !== requiredRole) {
    return <Navigate to={userRole === 'ADMIN' ? '/admin/dashboard' : '/dashboard'} replace />;
  }

  return children;
};

export default ProtectedRoute;
