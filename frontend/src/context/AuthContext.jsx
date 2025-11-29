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

  const [loading, setLoading] = useState(() => {
    // Initialize loading to true if we have a user in localStorage
    // This prevents premature rendering before keys are restored
    return !!localStorage.getItem('user');
  });
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
    typingUsers,
    sendMessage,
    joinGroup,
    leaveGroup,
    sendTypingIndicator: rawSendTypingIndicator,
    disconnect,
    showNotification,
    uploadMedia
  } = useWebSocket(user?.userId, user?.token);

  // ✅ UPDATED: Robust wrapper to always ensure a username is sent
  const sendTypingIndicator = useCallback((groupId, isTyping) => {
    // Try to find the best available name
    const nameToSend = user?.username || user?.email?.split('@')[0] || 'User';
    return rawSendTypingIndicator(groupId, isTyping, nameToSend);
  }, [rawSendTypingIndicator, user]);

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

      const username = userData.username;

      if (!userId) {
        throw new Error('Could not find userId in response');
      }

      return { userId, username };
    } catch (error) {
      console.error('❌ Error fetching user ID:', error);
      return null;
    }
  }, [apiBaseUrl, getApiBaseUrl]);

  // Login function
const login = useCallback(async (email, password) => {
  setLoading(true);
  try {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔐 Starting login process...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // 1️⃣ Perform backend authentication
    console.log('1️⃣ Authenticating with backend...');
    const data = await ApiClient.auth.login(email, password);
    const token = data.token;
    console.log('✅ Backend authentication successful');

    // 2️⃣ Fetch userId
    console.log('2️⃣ Fetching user ID...');
    const { userId, username: actualUsername } = await getUserIdByEmail(email, token);
    if (!userId) throw new Error('Could not retrieve user ID');
    if (!userId) throw new Error('Could not retrieve user ID');
    console.log('✅ User ID retrieved:', userId);

    // 3️⃣ CRITICAL: Generate and set session key FIRST
    console.log('3️⃣ Generating session key from password...');
    const sessionKeyUint8 = await sha256(new TextEncoder().encode(password));
    await keyCache.setSessionKey(sessionKeyUint8);
    
    // 💾 Persist session key to localStorage for session restoration
    const { uint8ToBase64 } = await import("../utils/cryptoUtils");
    localStorage.setItem('sessionKey', uint8ToBase64(sessionKeyUint8));
    console.log('✅ Session key set and persisted');

    // 4️⃣ Fetch user's encrypted private key from backend
    console.log('4️⃣ Fetching encrypted private key from backend...');
    const keyRes = await ApiClient.keys.getUserKeys(userId, token);
    console.log("✅ User keys fetched:", {
      hasPublicKey: !!keyRes?.publicKey,
      hasEncryptedPrivateKey: !!keyRes?.encryptedPrivateKey,
      hasSalt: !!keyRes?.salt
    });

    let userSecretKeyUint8 = null;
    if (keyRes?.encryptedPrivateKey && keyRes?.salt) {
      console.log("5️⃣ Recovering private key from password...");
      
      // 5️⃣ Recover private key
      userSecretKeyUint8 = await recoverUserPrivateKeyFromPassword(
        password,
        keyRes.encryptedPrivateKey,
        keyRes.salt
      );

      // Validate the recovered key
      if (!(userSecretKeyUint8 instanceof Uint8Array)) {
        console.error('❌ Recovered key is not Uint8Array!', {
          type: typeof userSecretKeyUint8,
          constructor: userSecretKeyUint8?.constructor?.name
        });
        throw new Error('Key recovery produced invalid key type');
      }

      console.log('✅ Private key recovered:', {
        type: userSecretKeyUint8.constructor.name,
        length: userSecretKeyUint8.length
      });

      // 6️⃣ Cache the decrypted key
      console.log('6️⃣ Caching private key...');
      await keyCache.setUserPrivateKey(userSecretKeyUint8, true);
      console.log('✅ Private key cached successfully');

      // 7️⃣ Verify the cache immediately
      console.log('7️⃣ Verifying cache...');
      const cachedKey = await keyCache.getUserPrivateKey();
      
      if (!cachedKey) {
        console.error('❌ Cache verification failed - key not found!');
        throw new Error('Failed to verify cached private key');
      }
      
      console.log('✅ Cache verification passed:', {
        type: cachedKey.constructor.name,
        length: cachedKey.length,
        matches: cachedKey.length === userSecretKeyUint8.length
      });

    } else {
      console.warn("⚠️ No encrypted key found — user may need re-registration");
    }

    // 8️⃣ Set user state and localStorage
    console.log('8️⃣ Setting user state...');
    const loggedInUser = {
      email,
      token,
      username: actualUsername || email.split('@')[0],
      userId,
      publicKey: keyRes?.publicKey,
    };
    
    setUser(loggedInUser);
    localStorage.setItem("user", JSON.stringify(loggedInUser));
    console.log('✅ User state set');

    // 9️⃣ Keep session password and decrypted key in memory
    setSessionPassword({ password, secretKey: userSecretKeyUint8 });

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Login complete - ALL keys cached and verified');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return loggedInUser;

  } catch (error) {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.error('❌ Login error:', error);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    setUser(null);
    localStorage.removeItem("user");
    localStorage.removeItem("sessionKey");
    
    // Clear any partially cached data
    await keyCache.clearUserPrivateKey();
    
    throw new Error(error.message || "Login failed");

  } finally {
    setLoading(false);
  }
}, [getUserIdByEmail]);


  // Restore session key on mount
  useEffect(() => {
    const restoreSession = async () => {
      // If no user, we're not loading anything
      if (!user) {
        setLoading(false);
        return;
      }

      const savedSessionKey = localStorage.getItem('sessionKey');
      if (savedSessionKey) {
        try {
          console.log('🔐 Restoring session key from storage...');
          const { base64ToUint8 } = await import("../utils/cryptoUtils");
          const sessionKey = base64ToUint8(savedSessionKey);
          await keyCache.setSessionKey(sessionKey);

          // Try to restore private key from IDB
          const privateKey = await keyCache.getUserPrivateKey();
          if (privateKey) {
            console.log('✅ Private key restored from cache');
          } else {
            console.warn('⚠️ Session key restored but private key not found in cache');
          }
        } catch (e) {
          console.error('❌ Error restoring session key:', e);
          localStorage.removeItem('sessionKey');
        }
      } else {
        console.log('ℹ️ No session key found in storage');
        // 🆕 If user is logged in but no session key, we must logout to get the key
        if (user) {
          console.warn("⚠️ User logged in but no session key found. Forcing logout to restore security context.");
          // We can't call logout() directly here because it might cause a loop or issues during render
          // Instead, we manually clear storage and state
          localStorage.removeItem('user');
          localStorage.removeItem('sessionKey');
          setUser(null);
          setSessionPassword(null);
          // Reload the page to ensure a clean slate
          window.location.reload();
        }
      }

      // Done loading
      setLoading(false);
    };

    restoreSession();
  }, [user]); // Run when user state is initialized/changed

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
      localStorage.removeItem("sessionKey"); // Clear session key

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
    typingUsers,
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
    uploadMedia,
    typingUsers
  ]);

  console.log('AuthProvider - providing context value:', value);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};