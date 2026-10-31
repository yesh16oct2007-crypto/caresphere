import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { Role } from '../types/index.js';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Role[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { isAuthenticated, isLoading, role } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-brand-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  }

  if (allowedRoles && role && !allowedRoles.includes(role)) {
    // If doctor attempts to open admin or patient attempts doctor, redirect to their home or their dashboard
    if (role === 'doctor') return <Navigate to="/dashboard/doctor" replace />;
    if (role === 'admin') return <Navigate to="/dashboard/admin" replace />;
    return <Navigate to="/dashboard/patient" replace />;
  }

  return <>{children}</>;
};
