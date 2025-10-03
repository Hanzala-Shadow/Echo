import React, { createContext, useContext, useState, useEffect } from 'react';
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
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [loading, setLoading] = useState(false);
  const [apiBaseUrl, setApiBaseUrl] = useState(null);

  // Use the WebSocket hook - it will connect when userId and token are available
  const { 
    isConnected, 
    messages: webSocketMessages,
    onlineUsers, 
    sendMessage, 
    joinGroup, 
    leaveGroup,
    sendTypingIndicator,
    disconnect
  } = useWebSocket(user?.userId, user?.token);

  const getApiBaseUrl = () => {
    try {
      const hostIp = import.meta.env.VITE_HOST_IP || window.location.hostname;
      
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
      
      const userData = await fetch(`${baseUrl}/users/email/${encodeURIComponent(email)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }).then(response => {
        if (!response.ok) throw new Error('Failed to fetch user data');
        return response.json();
      });
      
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
      const data = await ApiClient.auth.login(email, password);
      const token = data.token;
      
      const userId = await getUserIdByEmail(email, token);
      
      if (!userId) {
        throw new Error('Could not retrieve user ID');
      }
      
      const loggedInUser = { 
        email, 
        token: token,
        username: data.username || email.split('@')[0],
        userId: userId
      };
      
      setUser(loggedInUser);
      localStorage.setItem("user", JSON.stringify(loggedInUser));
      
      console.log('✅ Login successful, WebSocket will auto-connect');
      
      return loggedInUser;
      
    } catch (error) {
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

  const value = { 
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
    apiBaseUrl
  };
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};