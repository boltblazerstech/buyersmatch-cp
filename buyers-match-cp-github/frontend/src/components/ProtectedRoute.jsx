import React from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, role }) => {
  let storageKey = 'bm_client_user';
  let loginRoute = '/login';
  
  if (role === 'ADMIN') {
    storageKey = 'bm_admin_user';
    loginRoute = '/admin/login';
  } else if (role === 'SUPER_ADMIN') {
    storageKey = 'bm_super_admin_user';
    loginRoute = '/super-admin/login';
  }

  const userStr = localStorage.getItem(storageKey);

  if (!userStr) {
    return <Navigate to={loginRoute} replace />;
  }

  const user = JSON.parse(userStr);
  const userRole = user.role?.toUpperCase();
  const requiredRole = role?.toUpperCase();

  if (requiredRole && userRole !== requiredRole) {
    let redirect = '/dashboard';
    if (userRole === 'ADMIN') redirect = '/admin/dashboard';
    if (userRole === 'SUPER_ADMIN') redirect = '/super-admin/dashboard';
    return <Navigate to={redirect} replace />;
  }

  return children;
};

export default ProtectedRoute;
