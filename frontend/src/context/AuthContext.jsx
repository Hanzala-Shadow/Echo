import React, { createContext, useContext, useState } from 'react';

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
    // Check if user is already logged in from localStorage
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [loading, setLoading] = useState(false);

  const login = async (email, password) => {
    setLoading(true);
    console.log('Login attempt:', { email, password });
    
    try {
      // Demo credentials check
      if (email === 'alice@example.com' && password === 'StrongPass123!') {
        const demoUser = {
          id: 1,
          username: 'alice',
          email: 'alice@example.com',
          avatar: null,
          createdAt: new Date().toISOString()
        };
        
        setUser(demoUser);
        localStorage.setItem('user', JSON.stringify(demoUser));
        console.log('Demo user logged in:', demoUser);
        setLoading(false);
        return demoUser;
      } else {
        setLoading(false);
        throw new Error('Invalid email or password');
      }
    } catch (error) {
      setLoading(false);
      throw error;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  const value = { user, loading, login, logout };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};