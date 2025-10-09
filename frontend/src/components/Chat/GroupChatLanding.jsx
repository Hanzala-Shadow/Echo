import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../context/ThemeContext';

const GroupChatLanding = () => {
  const navigate = useNavigate();
  const { isDarkMode, colors } = useTheme();

  const features = [
    {
      icon: '👥',
      title: 'Group Chat',
      description: 'Create groups with minimum 3 members for collaborative conversations'
    },
    {
      icon: '💬',
      title: 'Real-time Messaging',
      description: 'Instant message delivery with real-time notifications'
    },
    {
      icon: '🔒',
      title: 'Secure Communication',
      description: 'End-to-end encrypted group conversations'
    },
    {
      icon: '📱',
      title: 'Cross-Platform',
      description: 'Access your groups from any device'
    }
  ];

  return (
    <div className={`min-h-screen flex flex-col ${isDarkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-blue-50 to-indigo-100'}`}>
      {/* Header */}
      <header className={`py-4 px-6 ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-sm`}>
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isDarkMode ? 'bg-blue-600' : 'bg-blue-500'}`}>
              <span className="text-white text-xl">💬</span>
            </div>
            <h1 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>GroupChat</h1>
          </div>
          <button
            onClick={() => navigate('/dashboard')}
            className={`px-4 py-2 rounded-lg font-medium ${
              isDarkMode 
                ? 'bg-gray-700 text-white hover:bg-gray-600' 
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            Back to Dashboard
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <div className="flex-1 flex items-center">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <h1 className={`text-4xl md:text-6xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Collaborative <span className="text-blue-500">Group Chat</span>
            </h1>
            <p className={`text-xl max-w-3xl mx-auto mb-10 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Create and join groups with a minimum of 3 members for rich collaborative conversations. 
              Experience real-time messaging with enhanced security and cross-platform access.
            </p>
            
            <div className="flex flex-col sm:flex-row justify-center gap-4 mb-16">
              <button
                onClick={() => navigate('/group-chat?createGroup=true')}
                className="px-8 py-4 bg-blue-500 hover:bg-blue-600 text-white font-bold rounded-lg text-lg transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-1"
              >
                Create New Group
              </button>
              <button
                onClick={() => navigate('/group-chat')}
                className={`px-8 py-4 font-bold rounded-lg text-lg transition-colors border-2 ${
                  isDarkMode 
                    ? 'bg-gray-800 text-white border-gray-600 hover:bg-gray-700' 
                    : 'bg-white text-gray-900 border-gray-300 hover:bg-gray-50'
                }`}
              >
                Join Existing Group
              </button>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mt-16">
            {features.map((feature, index) => (
              <div 
                key={index}
                className={`p-6 rounded-xl transition-all duration-300 hover:scale-105 ${
                  isDarkMode 
                    ? 'bg-gray-800 hover:bg-gray-700' 
                    : 'bg-white hover:bg-gray-50'
                } shadow-lg`}
              >
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {feature.title}
                </h3>
                <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
                  {feature.description}
                </p>
              </div>
            ))}
          </div>

          {/* How It Works */}
          <div className={`mt-20 p-8 rounded-2xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'} shadow-xl`}>
            <h2 className={`text-3xl font-bold text-center mb-12 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              How It Works
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">1</span>
                </div>
                <h3 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Create a Group
                </h3>
                <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
                  Start by creating a new group and selecting exactly 2 other users to join you.
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">2</span>
                </div>
                <h3 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Invite Members
                </h3>
                <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
                  Each group requires a minimum of 3 members (yourself plus 2 others).
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">3</span>
                </div>
                <h3 className={`text-xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  Start Chatting
                </h3>
                <p className={isDarkMode ? 'text-gray-300' : 'text-gray-600'}>
                  Begin collaborative conversations with your group members in real-time.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className={`py-8 ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className={isDarkMode ? 'text-gray-400' : 'text-gray-600'}>
              © {new Date().getFullYear()} GroupChat. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default GroupChatLanding;