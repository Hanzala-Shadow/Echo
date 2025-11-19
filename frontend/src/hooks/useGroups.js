import { useState } from 'react';
import ApiClient from '../services/api';                // UPDATED

export const useGroups = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const leaveGroup = async (groupId) => {
    setLoading(true);
    setError(null);
    
    try {
      await ApiClient.chat.leaveGroup(groupId);
      return { success: true };
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  const addMember = async (groupId, adminId, userId) => {
    setLoading(true);
    setError(null);
    
    try {
      await ApiClient.chat.addMember(groupId, adminId, userId);
      return { success: true };
    } catch (error) {
      setError(error.message);
      return { success: false, error: error.message };
    } finally {
      setLoading(false);
    }
  };

  return { leaveGroup, addMember, loading, error };
};