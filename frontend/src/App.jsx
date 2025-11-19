import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import ProtectedRoute from './features/auth/ProtectedRoute'; // UPDATED
import ErrorBoundary from './components/ui/ErrorBoundary';    // UPDATED

// UPDATED: Pages and Features
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';

// Lazy load components
const ChatContainer = lazy(() => import('./features/chat/GroupChatContainer')); // UPDATED & RENAMED
const DMContainer = lazy(() => import('./features/chat/DMContainer'));          // UPDATED

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