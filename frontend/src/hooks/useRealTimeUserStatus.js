import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import ApiClient from '../utils/apis';

/**
 * Custom hook for tracking real-time user status and DM indicators
 * Provides optimized updates with zero latency for online users and DM notifications
 */
const useRealTimeUserStatus = (usersList) => {
  const { user, webSocketMessages, onlineUsers } = useAuth();
  const [userDetails, setUserDetails] = useState({});
  const [dmSenders, setDmSenders] = useState(new Set());
  const [initialStatusProcessed, setInitialStatusProcessed] = useState(false);
  const [expectedOnlineUsers, setExpectedOnlineUsers] = useState(0);

  // Track when we've received the initial burst of status updates
  useEffect(() => {
    if (!initialStatusProcessed && onlineUsers.length > 0) {
      // Count how many online status updates we expect to receive
      // This includes the current user plus all other online users
      const expectedCount = onlineUsers.length;
      setExpectedOnlineUsers(expectedCount);
      
      // Set a more adaptive timeout based on the number of expected users
      // Give 50ms per user, with a minimum of 100ms and maximum of 1000ms
      const timeoutDuration = Math.min(Math.max(expectedCount * 50, 100), 1000);
      
      const timer = setTimeout(() => {
        setInitialStatusProcessed(true);
      }, timeoutDuration);
      
      return () => clearTimeout(timer);
    }
  }, [onlineUsers, initialStatusProcessed]);

  // Efficiently track users who have sent direct messages
  useEffect(() => {
    if (!webSocketMessages.length || !user || !usersList?.length) return;

    const updateDmSenders = async () => {
      try {
        // Use cached groups if available to avoid API calls
        let userGroups;
        if (updateDmSenders.cachedGroups) {
          userGroups = updateDmSenders.cachedGroups;
        } else {
          userGroups = await ApiClient.chat.getGroups();
          // Cache for 30 seconds
          updateDmSenders.cachedGroups = userGroups;
          setTimeout(() => {
            updateDmSenders.cachedGroups = null;
          }, 30000);
        }

        // Filter direct message groups (exactly 2 members)
        const directGroups = userGroups.filter(group => {
          const memberCount = group.memberCount || group.member_count || 0;
          return memberCount === 2;
        });

        // Create a set to track sender IDs
        const senders = new Set();

        // Process messages to identify DM senders
        webSocketMessages.forEach(msg => {
          // Only process text messages not from current user
          if (msg.type === 'text' && msg.senderId !== user.userId) {
            // Check if this message is in a DM group
            const isDmMessage = directGroups.some(dm => 
              (dm.groupId || dm.id) === (msg.groupId || msg.group_id)
            );
            
            if (isDmMessage) {
              senders.add(msg.senderId);
            }
          }
        });

        setDmSenders(senders);
      } catch (error) {
        console.error('Error updating DM senders:', error);
      }
    };

    // Use requestAnimationFrame for zero-latency updates
    const frameId = requestAnimationFrame(updateDmSenders);
    return () => {
      cancelAnimationFrame(frameId);
      // Clear timeout if it exists
      if (updateDmSenders.timeoutId) {
        clearTimeout(updateDmSenders.timeoutId);
      }
    };
  }, [webSocketMessages, user, usersList]);

  // Efficiently fetch and cache user details
  useEffect(() => {
    if (!usersList?.length || !user) return;

    const fetchUserDetails = async () => {
      const details = {};
      
      // Process users in batches to avoid overwhelming the API
      const batchSize = 5;
      for (let i = 0; i < usersList.length; i += batchSize) {
        const batch = usersList.slice(i, i + batchSize);
        const promises = batch
          .filter(username => username !== user.username) // Skip current user
          .map(async (username) => {
            try {
              // Use cached results if available
              if (fetchUserDetails.cache?.[username]) {
                details[username] = fetchUserDetails.cache[username];
                return;
              }
              
              const searchResults = await ApiClient.users.search(username);
              const foundUser = searchResults.find(u => u.username === username);
              if (foundUser) {
                details[username] = foundUser;
                // Cache for 5 minutes
                fetchUserDetails.cache = fetchUserDetails.cache || {};
                fetchUserDetails.cache[username] = foundUser;
                setTimeout(() => {
                  if (fetchUserDetails.cache) {
                    delete fetchUserDetails.cache[username];
                  }
                }, 300000);
              }
            } catch (error) {
              console.warn('Error fetching user details for:', username, error);
            }
          });
        
        await Promise.allSettled(promises);
      }
      
      setUserDetails(prev => ({ ...prev, ...details }));
    };

    // Use microtask for immediate execution with debouncing
    if (fetchUserDetails.debounceTimer) {
      clearTimeout(fetchUserDetails.debounceTimer);
    }
    
    fetchUserDetails.debounceTimer = setTimeout(() => {
      fetchUserDetails();
    }, 10); // Minimal debounce to handle rapid changes
    
    return () => {
      if (fetchUserDetails.debounceTimer) {
        clearTimeout(fetchUserDetails.debounceTimer);
      }
    };
  }, [usersList, user]);

  // Create optimized lookup functions
  const getUserStatus = useCallback((username) => {
    const userDetailsForUser = userDetails[username];
    if (!userDetailsForUser || !userDetailsForUser.userId) {
      return { isOnline: false, hasSentDm: false };
    }

    const userDetailId = Number(userDetailsForUser.userId);
    if (!userDetailId) {
      return { isOnline: false, hasSentDm: false };
    }

    // Check online status
    const isOnline = onlineUsers.some(onlineUser => {
      const onlineUserId = Number(onlineUser.userId);
      return onlineUserId === userDetailId && onlineUser.status === 'online';
    });

    // Check DM status
    const hasSentDm = dmSenders.has(userDetailId);

    return { isOnline, hasSentDm };
  }, [userDetails, onlineUsers, dmSenders]);

  // Return memoized values
  return useMemo(() => ({
    userDetails,
    getUserStatus,
    dmSenders, // Expose for debugging if needed
    initialStatusProcessed, // Expose to indicate when initial status updates are processed
    expectedOnlineUsers // Expose for debugging if needed
  }), [userDetails, getUserStatus, dmSenders, initialStatusProcessed, expectedOnlineUsers]);
};

export default useRealTimeUserStatus;