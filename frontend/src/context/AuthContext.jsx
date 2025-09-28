import React, { createContext, useContext, useState, useEffect } from 'react';

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

  // LOGIN
  const login = async (email, password) => {
    if (!apiBaseUrl) throw new Error("API not ready yet");
    setLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) throw new Error("Invalid credentials");

      const data = await response.json();
      const token = data.token;

      const loggedInUser = { email, token };
      setUser(loggedInUser);
      localStorage.setItem("user", JSON.stringify(loggedInUser));

      return loggedInUser;
    } finally {
      setLoading(false);
    }
  };

  // REGISTER
  const register = async (username, email, password) => {
    if (!apiBaseUrl) throw new Error("API not ready yet");
    setLoading(true);
    try {
      const response = await fetch(`${apiBaseUrl}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email, password })
      });

      if (!response.ok) throw new Error("Registration failed");

      const data = await response.json();

      const loggedInUser = {
        id: data.userId,
        username: data.username,
        email: data.email,
        token: null
      };

      setUser(loggedInUser);
      localStorage.setItem("user", JSON.stringify(loggedInUser));

      return loggedInUser;
    } finally {
      setLoading(false);
    }
  };

  // LOGOUT
  const logout = async () => {
    if (!apiBaseUrl) throw new Error("API not ready yet");
    if (user?.token) {
      await fetch(`${apiBaseUrl}/auth/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${user.token}` }
      });
    }
    setUser(null);
    localStorage.removeItem("user");
  };

  const value = { user, loading, login, register, logout, apiBaseUrl };
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
