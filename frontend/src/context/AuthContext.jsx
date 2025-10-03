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
  const [apiBaseUrl, setApiBaseUrl] = useState(null);

  // 🔑 Detect backend URL from environment
  useEffect(() => {
    const hostIp = import.meta.env.VITE_HOST_IP || window.location.hostname;
    const backendUrl = `http://${hostIp}:8080/api`;
    setApiBaseUrl(backendUrl);
  }, []);

  // Add token getter
  const token = user?.token || null;

  // Helper function to get userId from email (with token)
const getUserIdByEmail = async (email, token) => {
  try {
    console.log('🔍 Fetching user ID for email:', email);
    
    // Create a temporary ApiClient request with the token
    const userData = await fetch(`http://localhost:8080/api/users/email/${encodeURIComponent(email)}`, {
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
    
    // Extract userId from the response
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

// Then in login function:
const login = async (email, password) => {
  setLoading(true);
  try {
    const data = await ApiClient.auth.login(email, password);
    const token = data.token;
    
    // Use the token to fetch user data
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
