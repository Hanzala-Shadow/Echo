import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import ThemeToggle from './ThemeToggle';
import ApiClient from '../utils/apis';
import useRealTimeUserStatus from '../hooks/useRealTimeUserStatus'; // Import the new hook

const Dashboard = () => {
  const { user, logout } = useAuth();
  const { colors, isDarkMode } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(location.state?.activeTab || 'groups');
  const [loading, setLoading] = useState(false);

  // Clear location state after using it
  useEffect(() => {
    if (location.state?.activeTab) {
      window.history.replaceState({}, document.title, location.pathname);
    }
  }, [location.state]);

  const [groups, setGroups] = useState([]);
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState([]);

  // Use the new optimized hook for real-time user status
  const { getUserStatus, initialStatusProcessed, expectedOnlineUsers } = useRealTimeUserStatus(users);

  // Fetch user's groups
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      setLoading(true);
      try {
        // Fetch user's groups
        const userGroups = await ApiClient.chat.getGroups();
        console.log('📥 Dashboard - Raw groups data from API:', JSON.stringify(userGroups, null, 2));
        
        // Filter out groups with 2 or fewer members (only show groups with 3 or more members)
        const filteredGroups = userGroups.filter(group => {
          const memberCount = group.memberCount || group.member_count || 0;
          // Explicitly exclude groups with 2 or fewer members
          const shouldInclude = memberCount > 2;
          console.log(`🔍 Dashboard Group Filter - Name: ${group.groupName || group.name || 'Unknown'}, ID: ${group.groupId || group.id}, memberCount: ${memberCount}, shouldInclude: ${shouldInclude}`);
          return shouldInclude;
        });
        
        console.log('✅ Dashboard filtered groups (>2 members):', JSON.stringify(filteredGroups, null, 2));
        setGroups(filteredGroups);
        
        // Fetch all users for user management
        const allUsers = await ApiClient.users.getAllUsernames();
        console.log('📥 Dashboard - Fetched users:', allUsers); // Debug log
        setUsers(allUsers);
        // Set filtered users excluding current user
        setFilteredUsers(allUsers.filter(username => username !== user?.username));
      } catch (error) {
        console.error('❌ Dashboard - Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // Filter users based on search query
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredUsers(users.filter(username => username !== user?.username));
    } else {
      const filtered = users.filter(username => 
        username.toLowerCase().includes(searchQuery.toLowerCase()) && username !== user?.username
      );
      setFilteredUsers(filtered);
    }
  }, [searchQuery, users, user]);

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
      logout();
      navigate('/login');
    }
  };

  const tabs = [
    { id: 'groups', label: 'Groups', icon: '👥' },
    { id: 'users', label: 'Users', icon: '👤' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  // User card component with optimized real-time updates
  const UserCard = React.memo(({ username }) => {
    // Get real-time status using the optimized hook
    const { isOnline, hasSentDm } = getUserStatus(username);

    const handleChatClick = async (e) => {
      e.stopPropagation();
      
      try {
        // Search for the user by username to get their ID
        const searchResults = await ApiClient.users.search(username);
        const targetUser = searchResults.find(user => user.username === username);
        
        if (!targetUser) {
          console.error('User not found:', username);
          // Fallback to regular chat navigation
          navigate('/dm');
          return;
        }
        
        // Check if a DM already exists with this user
        const userGroups = await ApiClient.chat.getGroups();
        // ABANDON isDirect logic - use member count instead
        const directGroups = userGroups.filter(group => {
          const memberCount = group.memberCount || group.member_count || 0;
          return memberCount === 2;
        });
        
        let existingDM = null;
        for (const group of directGroups) {
          try {
            const membersData = await ApiClient.chat.getGroupMembers(group.groupId || group.group_id || group.id);
            if (membersData.member_ids.includes(targetUser.userId) && membersData.member_ids.includes(user.userId)) {
              existingDM = group;
              break;
            }
          } catch (error) {
            console.warn('Error checking group members:', error);
          }
        }
        
        if (existingDM) {
          // Navigate to existing DM
          console.log('Navigating to existing DM:', existingDM);
          navigate('/dm', { state: { groupId: existingDM.groupId || existingDM.group_id || existingDM.id } });
        } else {
          // Navigate to DM page with target user info, but don't create the group yet
          // The group will be created when the first message is sent
          console.log('Navigating to new DM with user:', targetUser.userId);
          navigate('/dm', { state: { targetUserId: targetUser.userId, username: username } });
        }
      } catch (error) {
        console.error('Error handling direct message:', error);
        // Fallback to regular chat navigation
        navigate('/dm');
      }
    };

    return (
      <div 
        className={`p-4 rounded-xl theme-surface border cursor-pointer transition-all duration-300 hover:scale-[102%] relative ${
          isDarkMode ? 'border-gray-700 hover:border-gray-500' : 'border-gray-300 hover:border-gray-500'
        } ${hasSentDm ? 'ring-2 ring-blue-500' : ''}`} // Add ring for users with DMs
      >
        {/* Message indicator for users who sent DMs */}
        {hasSentDm && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white dark:border-gray-900 animate-pulse"></div>
        )}
        
        <div className="flex items-center">
          <div className="relative">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold mr-3 ${
              isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-800'
            }`}>
              {username?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            {/* Green circle for online users - only show when initial status processing is complete */}
            {initialStatusProcessed && isOnline && (
              <div className="absolute bottom-0 right-3 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-gray-900"></div>
            )}
          </div>
          <div className="flex-1">
            <h3 className={`font-bold theme-text ${hasSentDm ? 'text-blue-600 dark:text-blue-400' : ''}`}>
              {username}
              {hasSentDm && (
                <span className="ml-2 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 px-2 py-0.5 rounded-full">
                  New Message
                </span>
              )}
            </h3>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {initialStatusProcessed ? (isOnline ? 'Online' : 'Offline') : `Loading status...`}
            </p>
          </div>
          <button 
            className={`px-3 py-1 text-sm rounded-lg font-medium transition-colors border ${
              isDarkMode 
                ? 'bg-white text-black border-black hover:bg-gray-200' 
                : 'bg-black text-white border-black hover:bg-gray-800'
            }`}
            onClick={handleChatClick}
          >
            Chat
          </button>
        </div>
      </div>
    );
  });

  return (
    <div className={`min-h-screen theme-bg ${isDarkMode ? 'dark' : ''}`}>
      {/* Header */}
      <header className={`border-b theme-border sticky top-0 z-10 theme-surface`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold theme-text">Echo Chat</h1>
            </div>
            
            <div className="flex items-center space-x-4">
              <ThemeToggle />
              <button
                onClick={handleLogout}
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                  isDarkMode 
                    ? 'bg-red-600 hover:bg-red-700 text-white' 
                    : 'bg-red-500 hover:bg-red-600 text-white'
                }`}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Back Module */}
        <div className={`rounded-2xl p-6 mb-8 theme-surface border ${
          isDarkMode ? 'border-gray-700' : 'border-gray-300'
        }`}>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-bold theme-text">
                Welcome back, <span className="theme-text">{user?.username || 'User'}!</span>
              </h2>
              <p className={`mt-2 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Here's what's happening with your chats today.
              </p>
            </div>
            <div className="mt-4 md:mt-0">
              <button 
                className={`px-4 py-2 rounded-lg font-medium transition-colors border ${
                  isDarkMode 
                    ? 'bg-white text-black border-black hover:bg-gray-200' 
                    : 'bg-black text-white border-black hover:bg-gray-800'
                }`}
                onClick={() => navigate('/chat', { state: { createGroup: true } })}
              >
                Open Chat
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Buttons with theme-aware colors */}
        <div className="flex flex-wrap gap-2 mb-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? (isDarkMode ? 'bg-black text-white' : 'bg-black text-white')
                  : (isDarkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700' : 'bg-gray-200 text-gray-700 hover:bg-gray-300')
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className={`rounded-2xl p-6 theme-surface border ${
          isDarkMode ? 'border-gray-700' : 'border-gray-300'
        }`}>
          {activeTab === 'groups' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold theme-text">Your Groups</h2>
                <button 
                  className={`flex items-center space-x-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
                    isDarkMode 
                      ? 'bg-white text-black border-black hover:bg-gray-200' 
                      : 'bg-black text-white border-black hover:bg-gray-800'
                  }`}
                  onClick={() => navigate('/chat', { state: { createGroup: true } })}
                >
                  <span>+</span>
                  <span>Create Group</span>
                </button>
              </div>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-500"></div>
                </div>
              ) : groups.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-5xl mb-4">👥</div>
                  <h3 className="text-xl font-medium theme-text mb-2">No groups yet</h3>
                  <p className={`${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    Create your first group to start chatting with others
                  </p>
                  <button 
                    className={`px-4 py-2 rounded-lg font-medium transition-colors border mt-4 ${
                      isDarkMode 
                        ? 'bg-white text-black border-black hover:bg-gray-200' 
                        : 'bg-black text-white border-black hover:bg-gray-800'
                    }`}
                    onClick={() => navigate('/chat', { state: { createGroup: true } })}
                  >
                    Create Group
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groups.map((group, index) => {
                    // Use the memberCount directly since the groups array is already filtered
                    const memberCount = group.memberCount;
                    console.log(`Dashboard Group ${index}:`, {
                      id: group.groupId || group.id,
                      name: group.groupName || group.name,
                      memberCount: memberCount,
                      isDirect: group.isDirect
                    });
                    return (
                      <div 
                        key={index}
                        className={`p-4 rounded-xl theme-surface border cursor-pointer transition-all duration-300 hover:scale-[1.02] ${
                          isDarkMode ? 'border-gray-700 hover:border-gray-500' : 'border-gray-300 hover:border-gray-500'
                        }`}
                        onClick={() => navigate('/chat', { state: { groupId: group.groupId || group.id } })}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="font-bold theme-text">{group.groupName || group.name || 'Unnamed Group'}</h3>
                            <p className={`text-sm mt-1 ${
                              isDarkMode ? 'text-gray-400' : 'text-gray-600'
                            }`}>
                              {memberCount} members
                            </p>
                          </div>
                          <button 
                            className={`px-3 py-1 text-sm rounded-lg font-medium transition-colors border ${
                              isDarkMode 
                                ? 'bg-white text-black border-black hover:bg-gray-200' 
                                : 'bg-black text-white border-black hover:bg-gray-800'
                            }`}
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate('/chat', { state: { groupId: group.groupId || group.id } });
                            }}
                          >
                            Chat
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {activeTab === 'users' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold theme-text">Users</h2>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`px-4 py-2 rounded-lg border pr-10 ${
                      isDarkMode 
                        ? 'bg-gray-800 border-gray-700 text-white' 
                        : 'bg-white border-gray-300 text-gray-900'
                    } focus:ring-2 focus:ring-gray-500 focus:border-gray-500`}
                  />
                  <span className="absolute right-3 top-2.5">🔍</span>
                </div>
              </div>
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-500"></div>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-5xl mb-4">👤</div>
                  <h3 className="text-xl font-medium theme-text mb-2">No users found</h3>
                  <p className={`${
                    isDarkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {searchQuery ? 'No users match your search' : 'There are no other users in the system yet'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredUsers
                    .filter(username => username !== user?.username) // Don't show current user
                    .map((username, index) => (
                      <UserCard key={index} username={username} />
                    ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'settings' && (
            <div>
              <h2 className="text-xl font-bold theme-text mb-6">Settings</h2>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-bold theme-text mb-4">Profile Settings</h3>
                  <div className={`p-6 rounded-xl theme-surface border ${
                    isDarkMode ? 'border-gray-700' : 'border-gray-300'
                  }`}>
                    <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6">
                      <div className="relative">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center font-bold ${
                          isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-800'
                        }`}>
                          <span className="text-xl font-bold">
                            {user?.username?.charAt(0)?.toUpperCase() || 'U'}
                          </span>
                        </div>
                        <button className={`absolute bottom-0 right-0 rounded-full p-1 shadow ${
                          isDarkMode ? 'bg-gray-700' : 'bg-white'
                        }`}>
                          <svg className={`w-4 h-4 ${
                            isDarkMode ? 'text-gray-300' : 'text-gray-600'
                          }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"></path>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"></path>
                          </svg>
                        </button>
                      </div>
                      <div className="text-center sm:text-left">
                        <h4 className="font-bold theme-text">{user?.username || 'User'}</h4>
                        <p className={`text-sm mt-1 ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          {user?.email || 'user@example.com'}
                        </p>
                        <button className={`mt-2 text-sm ${
                          isDarkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-900'
                        } hover:underline`}>
                          Edit Profile
                        </button>
                      </div>
                    </div>
                    
                    <div className="mt-6 space-y-4">
                      <div>
                        <label className={`block text-sm font-medium mb-1 uppercase tracking-wider ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          Username
                        </label>
                        <input
                          type="text"
                          defaultValue={user?.username || ''}
                          className={`w-full px-3 py-2 rounded-lg border ${
                            isDarkMode 
                              ? 'bg-gray-800 border-gray-700 text-white' 
                              : 'bg-white border-gray-300 text-gray-900'
                          } focus:ring-2 focus:ring-gray-500 focus:border-gray-500`}
                        />
                      </div>
                      <div>
                        <label className={`block text-sm font-medium mb-1 uppercase tracking-wider ${
                          isDarkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}>
                          Email
                        </label>
                        <input
                          type="email"
                          defaultValue={user?.email || ''}
                          className={`w-full px-3 py-2 rounded-lg border ${
                            isDarkMode 
                              ? 'bg-gray-800 border-gray-700 text-white' 
                              : 'bg-white border-gray-300 text-gray-900'
                          } focus:ring-2 focus:ring-gray-500 focus:border-gray-500`}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h3 className="font-bold theme-text mb-4">Preferences</h3>
                  <div className={`p-6 rounded-xl theme-surface border space-y-6 ${
                    isDarkMode ? 'border-gray-700' : 'border-gray-300'
                  }`}>
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-medium theme-text">Dark Mode</h4>
                        <p className={`text-sm mt-1 ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          Enable dark theme
                        </p>
                      </div>
                      <ThemeToggle />
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-medium theme-text">Notifications</h4>
                        <p className={`text-sm mt-1 ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          Receive notifications
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className={`w-11 h-6 rounded-full peer ${
                          isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
                        } peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:${
                          isDarkMode ? 'bg-gray-600' : 'bg-gray-400'
                        }`}></div>
                      </label>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-medium theme-text">Email Alerts</h4>
                        <p className={`text-sm mt-1 ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          Send email notifications
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" />
                        <div className={`w-11 h-6 rounded-full peer ${
                          isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
                        } peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:${
                          isDarkMode ? 'bg-gray-600' : 'bg-gray-400'
                        }`}></div>
                      </label>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="font-medium theme-text">Sound Effects</h4>
                        <p className={`text-sm mt-1 ${
                          isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          Play sounds for notifications
                        </p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked />
                        <div className={`w-11 h-6 rounded-full peer ${
                          isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
                        } peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:${
                          isDarkMode ? 'bg-gray-600' : 'bg-gray-400'
                        }`}></div>
                      </label>
                    </div>
                  </div>
                  
                  <div className={`mt-6 p-6 rounded-xl border ${
                    isDarkMode 
                      ? 'bg-red-900 bg-opacity-20 border-red-800' 
                      : 'bg-red-50 border-red-200'
                  }`}>
                    <h3 className={`font-bold mb-2 ${
                      isDarkMode ? 'text-red-400' : 'text-red-600'
                    }`}>Danger Zone</h3>
                    <p className={`text-sm mb-4 ${
                      isDarkMode ? 'text-red-400' : 'text-red-600'
                    }`}>
                      Permanently delete your account and all associated data.
                    </p>
                    <button className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isDarkMode 
                        ? 'bg-red-800 text-red-100 hover:bg-red-700' 
                        : 'bg-red-600 text-white hover:bg-red-700'
                    }`}>
                      Delete Account
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;