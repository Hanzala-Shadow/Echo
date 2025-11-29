
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import ThemeToggle from '../components/ui/ThemeToggle'; // UPDATED
import ApiClient from '../services/api';                // UPDATED (was utils/apis)
import useRealTimeUserStatus from '../hooks/useRealTimeUserStatus';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const { colors, isDarkMode } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(location.state?.activeTab || 'groups');
  const [loading, setLoading] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false); // State for logout modal

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
          const shouldInclude = !group.isDirect && memberCount > 0;
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
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    logout();
    navigate('/login');
  };

  const tabs = [
    { id: 'groups', label: 'Groups', icon: '👥' },
    { id: 'users', label: 'Users', icon: '👤' },
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
            const members = membersData?.members || [];
            const memberIds = members.map(member => member.user_id);
            if (memberIds.includes(targetUser.userId) && memberIds.includes(user.userId)) {
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
        className={`p-4 rounded-xl theme-surface border cursor-pointer transition-all duration-300 hover:scale-[102%] relative ${isDarkMode ? 'border-gray-700 hover:border-gray-500' : 'border-gray-300 hover:border-gray-500'
          } ${hasSentDm ? 'ring-2 ring-blue-500' : ''}`} // Add ring for users with DMs
      >
        {/* Message indicator for users who sent DMs */}
        {hasSentDm && (
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white dark:border-gray-900 animate-pulse"></div>
        )}

        <div className="flex items-center">
          <div className="relative">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold mr-3 ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-800'
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
            className="px-3 py-1 text-sm rounded-lg font-medium transition-all duration-300 hover:scale-105 text-white shadow-md"
            style={{
              background: `linear-gradient(to right, var(--accent-primary), var(--accent-secondary, var(--accent-primary)))`,
              boxShadow: `0 4px 15px -3px var(--shadow-color)`
            }}
            onClick={handleChatClick}
          >
            Chat
          </button>
        </div>
      </div>
    );
  });

  return (
    <div className={`min-h-screen theme-bg ${isDarkMode ? 'dark' : ''} relative overflow-hidden transition-colors duration-500`}>
      {/* Background Elements */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.03] bg-grid-pattern"></div>

        {/* Animated Gradient Blobs */}
        <div className="absolute top-0 -left-4 w-72 h-72 bg-purple-300 dark:bg-purple-900 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-20 animate-blob"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-yellow-300 dark:bg-yellow-900 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 dark:bg-pink-900 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>
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
                className={`px-3 py-1 rounded text-sm font-medium transition-colors ${isDarkMode
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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-32 sm:pb-8">
        {/* Welcome Back Module */}
        {/* Hero Banner */}
        <div className="relative rounded-3xl p-8 mb-12 overflow-hidden group">
          {/* Hero Background with Glass Effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 dark:from-violet-500/20 dark:to-fuchsia-500/20 backdrop-blur-xl border theme-border border-white/20 shadow-2xl transition-all duration-500 group-hover:scale-[1.01]"></div>

          {/* Decorative Circles */}
          <div className="absolute top-0 right-0 -mt-20 -mr-20 w-80 h-80 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-0 left-0 -mb-20 -ml-20 w-60 h-60 bg-gradient-to-tr from-blue-500/20 to-teal-500/20 rounded-full blur-3xl animate-pulse animation-delay-2000"></div>

          <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="space-y-2">
              <h2 className="text-4xl font-extrabold theme-text tracking-tight">
                Welcome back, <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-fuchsia-600 dark:from-violet-400 dark:to-fuchsia-400">{user?.username || 'User'}</span>
                <span className="inline-block animate-bounce-in ml-2">👋</span>
              </h2>
              <p className={`text-lg ${isDarkMode ? 'text-gray-300' : 'text-gray-600'} max-w-xl leading-relaxed`}>
                Your personal workspace is ready. Connect with friends, manage your groups, and stay organized.
              </p>
            </div>


          </div>
        </div>

        {/* Navigation Buttons - Desktop (Centered) */}
        <div className="hidden sm:flex justify-center flex-wrap gap-2 mb-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-6 py-3 rounded-xl text-sm font-medium transition-all duration-300 hover:scale-110 active:scale-95 ${activeTab === tab.id
                ? 'text-white shadow-xl ring-2 ring-offset-2 ring-offset-transparent'
                : (isDarkMode ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:shadow-lg' : 'bg-white text-gray-600 hover:bg-gray-50 hover:shadow-lg border border-gray-200')
                }`}
              style={activeTab === tab.id ? {
                background: `linear-gradient(to right, var(--accent-primary), var(--accent-secondary, var(--accent-primary)))`,
                boxShadow: `0 4px 15px -3px var(--shadow-color)`
              } : {}}
            >
              <span className="text-lg">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Mobile Bottom Navigation */}
        <div className={`sm:hidden fixed bottom-0 left-0 right-0 z-50 px-6 py-4 border-t theme-surface ${isDarkMode ? 'border-gray-800' : 'border-gray-200'
          } pb-safe`}>
          <div className="flex justify-around items-center">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center space-y-1 transition-all duration-300 ${activeTab === tab.id
                  ? 'transform -translate-y-2'
                  : 'opacity-60 hover:opacity-100'
                  }`}
              >
                <div className={`p-3 rounded-full transition-all ${activeTab === tab.id
                  ? (isDarkMode ? 'bg-white text-black shadow-lg shadow-white/20' : 'bg-black text-white shadow-lg shadow-black/20')
                  : 'bg-transparent theme-text'
                  }`}>
                  <span className="text-xl">{tab.icon}</span>
                </div>
                <span className={`text-xs font-medium ${activeTab === tab.id ? 'theme-text font-bold' : 'theme-text-secondary'
                  }`}>
                  {tab.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className={`rounded-2xl p-6 theme-surface border ${isDarkMode ? 'border-gray-700' : 'border-gray-300'
          }`}>
          {activeTab === 'groups' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold theme-text">Your Groups</h2>
                <button
                  className="flex items-center space-x-1 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 hover:scale-105 text-white shadow-md"
                  style={{
                    background: `linear-gradient(to right, var(--accent-primary), var(--accent-secondary, var(--accent-primary)))`,
                    boxShadow: `0 4px 15px -3px var(--shadow-color)`
                  }}
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
                  <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                    Create your first group to start chatting with others
                  </p>
                  <button
                    className="px-6 py-3 rounded-xl font-medium transition-all duration-300 hover:scale-105 text-white shadow-lg mt-4"
                    style={{
                      background: `linear-gradient(to right, var(--accent-primary), var(--accent-secondary, var(--accent-primary)))`,
                      boxShadow: `0 4px 15px -3px var(--shadow-color)`
                    }}
                    onClick={() => navigate('/chat', { state: { createGroup: true } })}
                  >
                    Create Group
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 justify-items-center">
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
                        className={`w-full p-5 rounded-2xl theme-surface border cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl group relative overflow-hidden ${isDarkMode ? 'border-gray-700 hover:border-violet-500/50' : 'border-gray-200 hover:border-violet-400/50'
                          }`}
                        onClick={() => navigate('/chat', { state: { groupId: group.groupId || group.id } })}
                      >
                        {/* Hover Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 to-fuchsia-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

                        <div className="flex justify-between items-start relative z-10">
                          <div className="flex items-center gap-4">
                            {/* Group Avatar Placeholder */}
                            <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold shadow-lg transition-transform duration-300 group-hover:scale-110 ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'}`}>
                              {group.groupName ? group.groupName.charAt(0).toUpperCase() : 'G'}
                            </div>

                            <div>
                              <h3 className="font-bold theme-text text-lg group-hover:text-violet-500 transition-colors">{group.groupName || group.name || 'Unnamed Group'}</h3>
                              <p className={`text-sm mt-1 flex items-center gap-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                                }`}>
                                <span>👥</span> {memberCount} members
                              </p>
                            </div>
                          </div>

                          <button
                            className="px-4 py-2 text-sm rounded-xl font-medium transition-all duration-300 opacity-0 group-hover:opacity-100 translate-x-4 group-hover:translate-x-0 text-white shadow-md"
                            style={{
                              background: `linear-gradient(to right, var(--accent-primary), var(--accent-secondary, var(--accent-primary)))`,
                              boxShadow: `0 4px 15px -3px var(--shadow-color)`
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate('/chat', { state: { groupId: group.groupId || group.id } });
                            }}
                          >
                            Chat →
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
                    className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg border pr-10 text-sm sm:text-base theme-surface theme-border theme-text focus:outline-none focus:ring-2"
                    style={{
                      '--tw-ring-color': 'var(--accent-primary)',
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      color: colors.text
                    }}
                  />
                  <span className="absolute right-3 top-1.5 sm:top-2.5 text-sm sm:text-base">🔍</span>
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
                  <p className={`${isDarkMode ? 'text-gray-400' : 'text-gray-600'
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

          {/* Removed settings tab content as it's useless */}
        </div>
      </div>

      {/* Styled Logout Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div
            className="w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden transform transition-all scale-100"
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderWidth: '1px'
            }}
          >
            <div className="p-6">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/20 mb-4">
                  <svg className="h-8 w-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold theme-text mb-2">
                  Sign Out
                </h3>
                <p className="text-sm theme-text-secondary mb-6">
                  Are you sure you want to sign out? You'll need to log in again to access your messages.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 border theme-border theme-text hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmLogout}
                  className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 shadow-lg shadow-red-500/30 transition-all duration-200 hover:scale-[1.02]"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
