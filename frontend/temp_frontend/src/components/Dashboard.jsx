import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import ThemeToggle from './ThemeToggle';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const { colors } = useTheme();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    totalGroups: 0,
    totalMessages: 0,
    onlineUsers: 0
  });

  // Fetch dashboard stats
  useEffect(() => {
    const fetchStats = async () => {
      if (!user) return;
      
      setLoading(true);
      try {
        // In a real app, you would fetch actual stats from the backend
        // For now, we'll simulate with dummy data
        setTimeout(() => {
          setStats({
            totalGroups: Math.floor(Math.random() * 10) + 1,
            totalMessages: Math.floor(Math.random() * 1000) + 100,
            onlineUsers: Math.floor(Math.random() * 50) + 10
          });
          setLoading(false);
        }, 1000);
      } catch (error) {
        console.error('Error fetching stats:', error);
        setLoading(false);
      }
    };

    fetchStats();
  }, [user]);

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
      logout();
      navigate('/login');
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'groups', label: 'Groups' },
    { id: 'settings', label: 'Settings' },
  ];

  return (
    <div className="min-h-screen theme-bg transition-colors duration-500 p-4">
      <div className="flex justify-between items-center mb-6 p-4 border-b theme-border">
        <h1 className="text-2xl font-bold theme-text">Dashboard</h1>
        <div className="flex items-center space-x-2">
          <span className="theme-text">Welcome, {user?.username || 'User'}!</span>
          <ThemeToggle />
          <button
            onClick={handleLogout}
            className="px-3 py-1 border rounded text-sm"
            style={{
              backgroundColor: 'transparent',
              borderColor: colors.border,
              color: colors.text
            }}
          >
            Logout
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="p-4 theme-surface border rounded shadow">
          <h3 className="text-lg font-semibold theme-text">Groups</h3>
          <p className="text-2xl font-bold theme-text">{stats.totalGroups}</p>
        </div>
        <div className="p-4 theme-surface border rounded shadow">
          <h3 className="text-lg font-semibold theme-text">Messages</h3>
          <p className="text-2xl font-bold theme-text">{stats.totalMessages}</p>
        </div>
        <div className="p-4 theme-surface border rounded shadow">
          <h3 className="text-lg font-semibold theme-text">Online Users</h3>
          <p className="text-2xl font-bold theme-text">{stats.onlineUsers}</p>
        </div>
      </div>

      <div className="mb-4">
        <div className="flex space-x-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded ${
                activeTab === tab.id
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 dark:bg-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4 theme-surface border rounded">
        {activeTab === 'overview' && (
          <div>
            <h2 className="text-xl font-semibold theme-text mb-4">Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-blue-100 dark:bg-blue-900 rounded">
                <h3 className="font-semibold theme-text">Recent Activity</h3>
                <ul className="mt-2 space-y-2">
                  <li className="theme-text">You joined "Team Chat" group</li>
                  <li className="theme-text">You sent a message in "General"</li>
                  <li className="theme-text">New member joined "Project Alpha"</li>
                </ul>
              </div>
              <div className="p-4 bg-green-100 dark:bg-green-900 rounded">
                <h3 className="font-semibold theme-text">Quick Actions</h3>
                <div className="mt-2 space-y-2">
                  <button className="w-full text-left p-2 bg-white dark:bg-gray-800 rounded hover:bg-gray-100 dark:hover:bg-gray-700 theme-text">
                    Create New Group
                  </button>
                  <button className="w-full text-left p-2 bg-white dark:bg-gray-800 rounded hover:bg-gray-100 dark:hover:bg-gray-700 theme-text">
                    Invite Friends
                  </button>
                </div>
              </div>
            </div>
            <div className="mt-4 p-4 bg-yellow-100 dark:bg-yellow-900 rounded">
              <h3 className="font-semibold theme-text">User Information</h3>
              <p className="theme-text">Email: {user?.email}</p>
              <p className="theme-text">User ID: {user?.userId}</p>
              <p className="theme-text">Username: {user?.username}</p>
            </div>
          </div>
        )}

        {activeTab === 'groups' && (
          <div>
            <h2 className="text-xl font-semibold theme-text mb-4">Your Groups</h2>
            <div className="space-y-3">
              <div className="p-3 theme-surface border rounded flex justify-between items-center">
                <div>
                  <h3 className="font-semibold theme-text">General Chat</h3>
                  <p className="text-sm theme-text-secondary">12 members</p>
                </div>
                <button className="px-3 py-1 bg-blue-500 text-white rounded text-sm">
                  Join
                </button>
              </div>
              <div className="p-3 theme-surface border rounded flex justify-between items-center">
                <div>
                  <h3 className="font-semibold theme-text">Project Alpha</h3>
                  <p className="text-sm theme-text-secondary">8 members</p>
                </div>
                <button className="px-3 py-1 bg-blue-500 text-white rounded text-sm">
                  Join
                </button>
              </div>
              <div className="p-3 theme-surface border rounded flex justify-between items-center">
                <div>
                  <h3 className="font-semibold theme-text">Team Chat</h3>
                  <p className="text-sm theme-text-secondary">5 members</p>
                </div>
                <button className="px-3 py-1 bg-blue-500 text-white rounded text-sm">
                  Join
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div>
            <h2 className="text-xl font-semibold theme-text mb-4">Settings</h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold theme-text">Profile Settings</h3>
                <div className="mt-2 p-3 theme-surface border rounded">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                      <span className="font-bold theme-text">{user?.username?.charAt(0)?.toUpperCase() || 'U'}</span>
                    </div>
                    <div>
                      <p className="theme-text">{user?.username}</p>
                      <p className="text-sm theme-text-secondary">{user?.email}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="font-semibold theme-text">Preferences</h3>
                <div className="mt-2 p-3 theme-surface border rounded space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="theme-text">Dark Mode</span>
                    <ThemeToggle />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="theme-text">Notifications</span>
                    <label className="switch">
                      <input type="checkbox" defaultChecked />
                      <span className="slider round"></span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;