import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import ProtectedRoute from './components/ProtectedRoute';
// ThemeToggle import removed
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

// Debug component to show current location
const DebugLocation = () => {
  const location = useLocation();
  console.log('=== ROUTE DEBUGGING ===');
  console.log('Current location:', location);
  console.log('Current pathname:', location.pathname);
  return null;
};

// Component to handle root route redirection
const RootRedirect = () => {
  const { user } = useAuth();
  
  // If user is authenticated, redirect to dashboard
  // Otherwise, redirect to login
  return user ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />;
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <DebugLocation />
          <div className="min-h-screen bg-white dark:bg-gray-900 transition-colors duration-200">
            {/* ThemeToggle removed from header */}
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/" element={<RootRedirect />} />
            </Routes>
          </div>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;