import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();
  
  console.log('=== PROTECTED ROUTE DEBUG ===');
  console.log('ProtectedRoute - current location:', location);
  console.log('ProtectedRoute - user:', user);
  console.log('ProtectedRoute - loading:', loading);
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center theme-bg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="theme-text">Loading...</p>
        </div>
      </div>
    );
  }
  
  // Check if user exists and has required properties
  if (user && user.token && user.userId) {
    console.log('ProtectedRoute - valid user, rendering children');
    return children;
  } else {
    console.log('ProtectedRoute - no valid user, redirecting to login');
    // Pass the attempted location to login page so we can redirect back after login
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
};

export default ProtectedRoute;