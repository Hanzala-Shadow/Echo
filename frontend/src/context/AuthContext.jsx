import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import ApiClient from '../utils/apis';  
import useWebSocket from '../hooks/useWebSocket'; // Import the hook

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    console.log('AuthProvider - initial user from localStorage:', savedUser);
    if (savedUser) {
      try {
        const parsedUser = JSON.parse(savedUser);
        console.log('AuthProvider - parsed user:', parsedUser);
        return parsedUser;
      } catch (e) {
        console.error('AuthProvider - error parsing user from localStorage:', e);
        localStorage.removeItem('user');
        return null;
      }
    }
    return null;
  });
  const [loading, setLoading] = useState(false);
  const [apiBaseUrl, setApiBaseUrl] = useState(null);

  // Add debugging
  useEffect(() => {
    console.log('AuthProvider - user state changed:', user);
  }, [user]);

  // Use the WebSocket hook - it will connect when userId and token are available
  const { 
    isConnected, 
    messages: webSocketMessages,
    onlineUsers, 
    sendMessage, 
    joinGroup, 
    leaveGroup,
    sendTypingIndicator,
    disconnect,
    showNotification // Add showNotification from useWebSocket
  } = useWebSocket(user?.userId, user?.token);

  const getApiBaseUrl = () => {
    try {
      const hostIp = import.meta.env.VITE_HOST_IP || window.location.hostname;
      
      // For Docker environment or local development, use localhost
      if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return 'http://localhost:8080/api';
      }
      
      // Clean the host IP - use first IP
      const cleanIp = hostIp.trim().split(/\s+/)[0];
      
      // Validate IP format
      if (!cleanIp || cleanIp.includes(' ')) {
        console.warn('Invalid host IP, falling back to localhost');
        return 'http://localhost:8080/api';
      }
      
      const url = `http://${cleanIp}:8080/api`;
      
      // Test if URL is valid
      new URL(url);
      return url;
    } catch (error) {
      console.warn('Error constructing API URL, falling back to localhost:', error);
      return 'http://localhost:8080/api';
    }
  };

  // Initialize API base URL
  useEffect(() => {
    const baseUrl = getApiBaseUrl();
    setApiBaseUrl(baseUrl);
    console.log('🌐 API Base URL set to:', baseUrl);
  }, []);

  // Helper function to get userId from email
  const getUserIdByEmail = async (email, token) => {
    try {
      console.log('🔍 Fetching user ID for email:', email);
      
      const baseUrl = apiBaseUrl || getApiBaseUrl();
      
      const response = await fetch(`${baseUrl}/users/email/${encodeURIComponent(email)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const userData = await response.json();
      console.log('📨 User data response:', userData);
      
      const userId = userData.userId || userData.id;
      console.log('🎯 Extracted userId:', userId);
      
      if (!userId) {
        throw new Error('Could not find userId in response');
      }
      
      return userId;
    } catch (error) {
      console.error('❌ Error fetching user ID:', error);
      return null;
    }
  };

  // Login function
  const login = async (email, password) => {
    setLoading(true);
    try {
      console.log('AuthProvider - attempting login with email:', email);
      const data = await ApiClient.auth.login(email, password);
      console.log('AuthProvider - login response:', data);
      const token = data.token;
      
      const userId = await getUserIdByEmail(email, token);
      console.log('AuthProvider - userId from API:', userId);
      
      if (!userId) {
        throw new Error('Could not retrieve user ID');
      }
      
      const loggedInUser = { 
        email, 
        token: token,
        username: data.username || email.split('@')[0],
        userId: userId
      };
      
      console.log('AuthProvider - setting user state:', loggedInUser);
      setUser(loggedInUser);
      localStorage.setItem("user", JSON.stringify(loggedInUser));
      
      console.log('✅ Login successful, WebSocket will auto-connect');
      
      return loggedInUser;
      
    } catch (error) {
      console.error('AuthProvider - login error:', error);
      // Clear user state on login error
      setUser(null);
      localStorage.removeItem("user");
      throw new Error(error.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  // Register function
  const register = async (username, email, password) => {
    setLoading(true);
    try {
      const data = await ApiClient.auth.register(username, email, password);

      return { 
        success: true,
        message: "Registration successful. Please login.",
        userId: data.userId,
        username: data.username,
        email: data.email
      };
      
    } catch (error) {
      throw new Error(error.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  // Logout function - disconnect WebSocket
  const logout = async () => {
    try {
      // Disconnect WebSocket
      disconnect();
      
      if (user?.token) {
        await ApiClient.auth.logout();
      }
    } catch (error) {
      console.error("Logout API error:", error);
    } finally {
      setUser(null);
      localStorage.removeItem("user");
      console.log('✅ Logout complete, WebSocket disconnected');
    }
  };

  // Optimize the context value with useMemo to prevent unnecessary re-renders
  const value = useMemo(() => ({
    user, 
    loading, 
    login, 
    register, 
    logout, 
    token: user?.token,
    // WebSocket properties from the hook
    isWebSocketConnected: isConnected,
    webSocketMessages,
    onlineUsers,
    sendWebSocketMessage: sendMessage,
    joinGroup,
    leaveGroup,
    sendTypingIndicator,
    apiBaseUrl,
    showNotification // Expose the showNotification function
  }), [
    user, 
    loading, 
    login, 
    register, 
    logout, 
    isConnected,
    webSocketMessages,
    onlineUsers,
    sendMessage,
    joinGroup,
    leaveGroup,
    sendTypingIndicator,
    apiBaseUrl,
    showNotification
  ]);

  console.log('AuthProvider - providing context value:', value);
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};