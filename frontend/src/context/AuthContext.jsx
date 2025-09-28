<<<<<<< HEAD
import React, { createContext, useContext, useState, useEffect } from 'react';
=======
// frontend/src/context/AuthContext.jsx
import React, { createContext, useContext, useState } from 'react';
import ApiClient from '../utils/apis';  
>>>>>>> origin/Phase-2-Frontend-Integrated

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

  // 🔑 Detect backend URL from environment
  useEffect(() => {
    const hostIp = import.meta.env.VITE_HOST_IP || window.location.hostname;
    const backendUrl = `http://${hostIp}:8080/api`;
    setApiBaseUrl(backendUrl);
  }, []);

  // Add token getter
  const token = user?.token || null;

  // LOGIN - Updated to use ApiClient
  const login = async (email, password) => {
    if (!apiBaseUrl) throw new Error("API not ready yet");
    setLoading(true);
    try {
      const data = await ApiClient.auth.login(email, password);
      
      const loggedInUser = { 
        email, 
        token: data.token,
        username: data.username || email.split('@')[0] // Fallback username
      };
      
      setUser(loggedInUser);
      localStorage.setItem("user", JSON.stringify(loggedInUser));
      return loggedInUser;
      
    } catch (error) {
      throw new Error(error.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  // REGISTER - Updated to use ApiClient
  const register = async (username, email, password) => {
    if (!apiBaseUrl) throw new Error("API not ready yet");
    setLoading(true);
    try {
      const data = await ApiClient.auth.register(username, email, password);
      
      // Return success but don't auto-login
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

  // LOGOUT - Updated to use ApiClient
  const logout = async () => {
    try {
      if (user?.token) {
        await ApiClient.auth.logout();
      }
    } catch (error) {
      console.error("Logout API error:", error);
    } finally {
      setUser(null);
      localStorage.removeItem("user");
    }
  };

  const value = { user, loading, login, register, logout, token };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
