import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import ApiClient from '../services/api';                // UPDATED (utils/apis -> services/api)
import useWebSocket from '../hooks/useWebSocket';

import {
  generateAndPasswordWrapUserKey,
  recoverUserPrivateKeyFromPassword
} from "../services/keyManager";
import { sha256 } from "../utils/cryptoUtils";
import * as keyCache from "../services/keyCache";

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
  const [sessionPassword, setSessionPassword] = useState(null);

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
    showNotification,
    uploadMedia
  } = useWebSocket(user?.userId, user?.token);

  const getApiBaseUrl = useCallback(() => {
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
  }, []);

  // Initialize API base URL
  useEffect(() => {
    const baseUrl = getApiBaseUrl();
    setApiBaseUrl(baseUrl);
    console.log('🌐 API Base URL set to:', baseUrl);
  }, [getApiBaseUrl]);

  // Helper function to get userId from email
  const getUserIdByEmail = useCallback(async (email, token) => {
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
  }, [apiBaseUrl, getApiBaseUrl]);

  // Login function
  const login = useCallback(async (email, password) => {
    setLoading(true);
    try {
      console.log('AuthProvider - attempting login with email:', email);

      // 1️⃣ Perform backend authentication
      const data = await ApiClient.auth.login(email, password);
      const token = data.token;

      // 2️⃣ Fetch userId
      const userId = await getUserIdByEmail(email, token);
      if (!userId) throw new Error('Could not retrieve user ID');

      // 3️⃣ Fetch user's encrypted private key from backend
      const keyRes = await ApiClient.keys.getUserKeys(userId, token);
      console.log("🔑 Fetched user keys:", keyRes);

      let userSecretKeyUint8 = null;
      if (keyRes?.encryptedPrivateKey && keyRes?.salt) {
        // 4️⃣ Recover private key
        userSecretKeyUint8 = await recoverUserPrivateKeyFromPassword(
          password,
          keyRes.encryptedPrivateKey,
          keyRes.salt
        );

        // 5️⃣ Cache the decrypted key (in-memory + optional IndexedDB)
        const sessionKey =await sha256(new TextEncoder().encode(password));
        await keyCache.setSessionKey(sessionKey);
        await keyCache.setUserPrivateKey(userSecretKeyUint8, true);
      } else {
        console.warn("No encrypted key found — user may need re-registration");
      }

      // 6️⃣ Set user state and localStorage
      const loggedInUser = {
        email,
        token,
        username: data.username || email.split('@')[0],
        userId,
        publicKey: keyRes?.publicKey,
      };
      setUser(loggedInUser);
      localStorage.setItem("user", JSON.stringify(loggedInUser));

      // 7️⃣ Keep session password and decrypted key in memory
      setSessionPassword({ password, secretKey: userSecretKeyUint8 });

      console.log('✅ Login successful — private key decrypted and stored in-memory');
      return loggedInUser;

    } catch (error) {
      console.error('AuthProvider - login error:', error);
      setUser(null);
      localStorage.removeItem("user");
      throw new Error(error.message || "Login failed");

    } finally {
      setLoading(false);
    }
  }, [getUserIdByEmail]);

  // Register function
  const register = useCallback(async (username, email, password) => {
    setLoading(true);
    try {
      console.log('🔐 Starting registration process...');
      
      // 🔹 Step 1: Generate keys and wrap private key
      console.log('🔑 Generating keypair...');
      const keyPayload = await generateAndPasswordWrapUserKey(password);
      console.log("🪶 Generated keypair:", keyPayload);

      // 🔹 Step 2: Register user in backend
      console.log('📝 Registering user with backend...');
      const data = await ApiClient.auth.register(username, email, password);
      console.log('✅ Backend registration successful:', data);

      // 🔹 Step 3: Upload key data to backend
      console.log('⬆️ Uploading keys to backend...');
      await ApiClient.keys.uploadUserKeys({
        userId: data.userId,
        publicKey: keyPayload.publicKeyBase64,
        encryptedPrivateKey: keyPayload.encryptedPrivateKey,
        salt: keyPayload.saltBase64,
        nonce: keyPayload.pbkdf2Iterations
      });
      console.log('✅ Keys uploaded successfully');

      return {
        success: true,
        message: "Registration successful — keys uploaded.",
        userId: data.userId,
        username: data.username,
        email: data.email
      };
    } catch (error) {
      console.error("❌ Registration error:", error);
      console.error("Error stack:", error.stack);
      throw new Error(error.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  }, []);

  // Logout function - disconnect WebSocket
  const logout = useCallback(async () => {
    try {
      // 1️⃣ Disconnect WebSocket
      disconnect();

      // 2️⃣ Call backend logout if token exists
      if (user?.token) {
        await ApiClient.auth.logout();
      }

    } catch (error) {
      console.error("Logout API error:", error);

    } finally {
      // 3️⃣ Clear local state
      setUser(null);
      localStorage.removeItem("user");

      // 4️⃣ Clear cached keys
      await keyCache.clearUserPrivateKey();
      await keyCache.clearAllGroupKeys();
      setSessionPassword(null);

      console.log('✅ Logout complete, WebSocket disconnected, keys cleared');
    }
  }, [disconnect, user?.token]);

  // Optimize the context value with useMemo to prevent unnecessary re-renders
  const value = useMemo(() => ({
    user, 
    loading, 
    login, 
    register, 
    logout, 
    token: user?.token,
    sessionPassword,
    setSessionPassword,
    // WebSocket properties from the hook
    isWebSocketConnected: isConnected,
    webSocketMessages,
    onlineUsers,
    sendWebSocketMessage: sendMessage,
    joinGroup,
    leaveGroup,
    sendTypingIndicator,
    apiBaseUrl,
    showNotification,
    uploadMedia
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
    showNotification,
    uploadMedia
  ]);

  console.log('AuthProvider - providing context value:', value);
  
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};