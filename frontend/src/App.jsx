import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './components/Dashboard';
import ErrorBoundary from './components/Common/ErrorBoundary';
// Lazy load components for better performance
const ChatContainer = lazy(() => import('./components/Chat/ChatContainer'));
const DMContainer = lazy(() => import('./components/Chat/DMContainer'));

function App() {
  return (
    <Router>
      <AuthProvider>
        <ThemeProvider>
          <div className="App">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/dashboard" element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              } />
              <Route path="/chat" element={
                <ErrorBoundary>
                <ProtectedRoute>
                  <Suspense fallback={<div className="flex justify-center items-center h-screen">Loading...</div>}>
                    <ChatContainer />
                  </Suspense>
                </ProtectedRoute>
                </ErrorBoundary>
              } />
              <Route path="/dm" element={
                <ProtectedRoute>
                  <Suspense fallback={<div className="flex justify-center items-center h-screen">Loading...</div>}>
                    <DMContainer />
                  </Suspense>
                </ProtectedRoute>
              } />
            </Routes>
          </div>
        </ThemeProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;