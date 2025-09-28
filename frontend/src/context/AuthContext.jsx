// frontend/src/context/AuthContext.jsx
import React, { createContext, useContext, useState } from 'react';
import ApiClient from '../utils/apis';  

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

  // Add token getter
  const token = user?.token || null;

  // LOGIN - Updated to use ApiClient
  const login = async (email, password) => {
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