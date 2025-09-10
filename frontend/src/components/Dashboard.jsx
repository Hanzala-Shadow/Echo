import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import ThemeToggle from './ThemeToggle';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const { colors, isDarkMode } = useTheme();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  const handleLogout = () => {
    if (confirm('Are you sure you want to logout?')) {
      logout();
      navigate('/login');
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '🏠' },
    { id: 'chat', label: 'Chat', icon: '💬' },
    { id: 'ai-tools', label: 'AI Tools', icon: '🤖' },
    { id: 'settings', label: 'Settings', icon: '⚙️' },
  ];

  return (
    <div className="min-h-screen theme-bg transition-colors duration-500">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden">
        <div 
          className="absolute -top-40 -right-40 w-80 h-80 rounded-full opacity-10 animate-float" 
          style={{ 
            background: isDarkMode 
              ? 'linear-gradient(45deg, #ffffff, #e5e7eb)' 
              : 'linear-gradient(45deg, #000000, #374151)' 
          }}
        ></div>
        <div 
          className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full opacity-10 animate-float-delayed" 
          style={{ 
            background: isDarkMode 
              ? 'linear-gradient(45deg, #ffffff, #e5e7eb)' 
              : 'linear-gradient(45deg, #000000, #374151)' 
          }}
        ></div>
      </div>

      {/* Header */}
      <div className="relative z-10 p-6 border-b-2 theme-border">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <h1 className="text-2xl font-bold theme-text">Echo Chat</h1>
            <span className="text-sm theme-text-secondary">Welcome back, {user?.username || 'User'}!</span>
          </div>
          <div className="flex items-center space-x-4">
            <ThemeToggle />
            <button
              onClick={handleLogout}
              className="px-4 py-2 border-2 rounded-lg font-medium transition-all duration-300 hover-scale"
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
      </div>

      {/* Navigation Tabs */}
      <div className="relative z-10 p-6">
        <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-md font-medium transition-all duration-300 hover-scale ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-gray-700 shadow-sm'
                  : 'hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
              style={{
                color: activeTab === tab.id ? colors.text : colors.textSecondary
              }}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div className="relative z-10 p-6">
        <div className="max-w-6xl mx-auto">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="theme-surface p-6 rounded-xl border-2 theme-border hover-scale">
                  <h3 className="text-lg font-semibold theme-text mb-2">Recent Chats</h3>
                  <p className="text-sm theme-text-secondary">No recent conversations</p>
                </div>
                <div className="theme-surface p-6 rounded-xl border-2 theme-border hover-scale">
                  <h3 className="text-lg font-semibold theme-text mb-2">AI Tools</h3>
                  <p className="text-sm theme-text-secondary">5 tools available</p>
                </div>
                <div className="theme-surface p-6 rounded-xl border-2 theme-border hover-scale">
                  <h3 className="text-lg font-semibold theme-text mb-2">Messages</h3>
                  <p className="text-sm theme-text-secondary">0 unread messages</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'chat' && (
            <div className="theme-surface p-8 rounded-xl border-2 theme-border">
              <h2 className="text-xl font-semibold theme-text mb-4">Chat Interface</h2>
              <p className="theme-text-secondary">Chat functionality coming soon...</p>
            </div>
          )}

          {activeTab === 'ai-tools' && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold theme-text">AI Tools</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="theme-surface p-6 rounded-xl border-2 theme-border hover-scale">
                  <h3 className="text-lg font-semibold theme-text mb-2">🤖 Smart Reply</h3>
                  <p className="text-sm theme-text-secondary">Generate intelligent responses</p>
                </div>
                <div className="theme-surface p-6 rounded-xl border-2 theme-border hover-scale">
                  <h3 className="text-lg font-semibold theme-text mb-2">📝 Summarizer</h3>
                  <p className="text-sm theme-text-secondary">Summarize long conversations</p>
                </div>
                <div className="theme-surface p-6 rounded-xl border-2 theme-border hover-scale">
                  <h3 className="text-lg font-semibold theme-text mb-2">🌐 Translator</h3>
                  <p className="text-sm theme-text-secondary">Translate messages instantly</p>
                </div>
                <div className="theme-surface p-6 rounded-xl border-2 theme-border hover-scale">
                  <h3 className="text-lg font-semibold theme-text mb-2">🛡️ Toxicity Control</h3>
                  <p className="text-sm theme-text-secondary">Filter harmful content</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'settings' && (
            <div className="theme-surface p-8 rounded-xl border-2 theme-border">
              <h2 className="text-xl font-semibold theme-text mb-4">Settings</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="theme-text">Dark Mode</span>
                  <ThemeToggle />
                </div>
                <div className="flex items-center justify-between">
                  <span className="theme-text">Notifications</span>
                  <input type="checkbox" className="rounded" />
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






