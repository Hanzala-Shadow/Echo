// Group Chat Service - Handles all group-related API operations
import ApiClient from '../utils/apis';

class GroupChatService {
  /**
   * Fetch all groups for the current user
   * @returns {Promise<Array>} Array of group objects
   */
  static async fetchUserGroups() {
    try {
      const response = await ApiClient.chat.getGroups();
      console.log('Fetched user groups:', response);
      return response;
    } catch (error) {
      console.error('Error fetching user groups:', error);
      throw new Error('Failed to fetch groups');
    }
  }

  /**
   * Create a new group with specified members
   * @param {string} groupName - Name of the group
   * @param {Array<number>} memberIds - Array of user IDs to include in the group
   * @returns {Promise<Object>} Created group object
   */
  static async createGroup(groupName, memberIds) {
    try {
      if (!groupName || groupName.trim().length === 0) {
        throw new Error('Group name is required');
      }

      if (!Array.isArray(memberIds) || memberIds.length === 0) {
        throw new Error('At least one member is required');
      }

      // Validate that we have at least 2 other members
      if (memberIds.length < 2) {
        throw new Error('At least 2 other members are required for group creation');
      }

      const response = await ApiClient.chat.createGroup(groupName.trim(), memberIds);
      console.log('Created group:', response);
      return response;
    } catch (error) {
      console.error('Error creating group:', error);
      throw new Error(error.message || 'Failed to create group');
    }
  }

  /**
   * Fetch members of a specific group
   * @param {number} groupId - ID of the group
   * @returns {Promise<Object>} Group members data
   */
  static async fetchGroupMembers(groupId) {
    try {
      if (!groupId) {
        throw new Error('Group ID is required');
      }

      const response = await ApiClient.chat.getGroupMembers(groupId);
      console.log(`Fetched members for group ${groupId}:`, response);
      return response;
    } catch (error) {
      console.error(`Error fetching members for group ${groupId}:`, error);
      throw new Error('Failed to fetch group members');
    }
  }

  /**
   * Fetch message history for a specific group
   * @param {number} groupId - ID of the group
   * @returns {Promise<Array>} Array of message objects
   */
  static async fetchGroupMessages(groupId) {
    try {
      if (!groupId) {
        throw new Error('Group ID is required');
      }

      const response = await ApiClient.chat.getGroupMessages(groupId);
      console.log(`Fetched messages for group ${groupId}:`, response);
      return response;
    } catch (error) {
      console.error(`Error fetching messages for group ${groupId}:`, error);
      throw new Error('Failed to fetch group messages');
    }
  }

  /**
   * Search for users by username
   * @param {string} query - Search query
   * @returns {Promise<Array>} Array of user objects
   */
  static async searchUsers(query) {
    try {
      if (!query || query.trim().length === 0) {
        return [];
      }

      const response = await ApiClient.users.search(query.trim());
      console.log(`Search results for "${query}":`, response);
      return response;
    } catch (error) {
      console.error(`Error searching users for query "${query}":`, error);
      return [];
    }
  }

  /**
   * Get user profile by ID
   * @param {number} userId - ID of the user
   * @returns {Promise<Object>} User profile data
   */
  static async getUserProfile(userId) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const response = await ApiClient.users.getProfile(userId);
      console.log(`Fetched profile for user ${userId}:`, response);
      return response;
    } catch (error) {
      console.error(`Error fetching profile for user ${userId}:`, error);
      throw new Error('Failed to fetch user profile');
    }
  }

  /**
   * Validate group creation parameters
   * @param {string} groupName - Name of the group
   * @param {Array<number>} memberIds - Array of member IDs
   * @returns {Object} Validation result
   */
  static validateGroupCreation(groupName, memberIds) {
    const errors = [];

    if (!groupName || groupName.trim().length === 0) {
      errors.push('Group name is required');
    }

    if (groupName && groupName.trim().length > 50) {
      errors.push('Group name must be less than 50 characters');
    }

    if (!Array.isArray(memberIds)) {
      errors.push('Member IDs must be an array');
    } else if (memberIds.length < 2) {
      errors.push('At least 2 other members are required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Transform group data for consistent structure
   * @param {Object} group - Raw group data from API
   * @returns {Object} Transformed group data
   */
  static transformGroupData(group) {
    return {
      id: group.groupId || group.id,
      name: group.groupName || group.name || `Group ${group.groupId || group.id}`,
      description: group.description || 'Group chat',
      memberCount: group.memberCount || group.member_count || 0,
      isOnline: true,
      createdBy: group.createdBy || group.created_by,
      isDirect: group.isDirect || group.is_direct || false,
      createdAt: group.createdAt || group.created_at
    };
  }

  /**
   * Transform user data for consistent structure
   * @param {Object} user - Raw user data from API
   * @returns {Object} Transformed user data
   */
  static transformUserData(user) {
    return {
      userId: user.userId || user.id,
      name: user.username || user.name || `User ${user.userId || user.id}`,
      username: user.username || `user${user.userId || user.id}`,
      email: user.email || '',
      status: 'offline'
    };
  }
}

export default GroupChatService;