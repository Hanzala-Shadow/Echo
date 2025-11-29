import React from 'react';
import { useTheme } from '../../context/ThemeContext';

const AiResultModal = ({ 
  isOpen, 
  onClose, 
  result, 
  type, 
  groupName, 
  isDarkMode, 
  colors 
}) => {
  const { theme } = useTheme();

  if (!isOpen || !result) return null;

  let title = '';
  let content = null;
  let icon = '';

  if (type === 'summarize') {
    title = `Chat Summary for ${groupName}`;
    icon = '📝';
    content = (
      <div className="space-y-3">
        {/* FIX 1: Use snake_case for total messages count */}
        <p className="text-sm theme-text-secondary">
          Summary generated from the last {result.total_messages || 50} messages.
        </p>
        <div className={`p-4 rounded-lg overflow-y-auto max-h-[50vh] ${isDarkMode ? 'bg-gray-700/30 border border-gray-600' : 'bg-gray-100 border border-gray-300'}`}>
          <p className="whitespace-pre-wrap theme-text text-sm">
            {result.summary}
          </p>
        </div>
      </div>
    );
  } else if (type === 'deadlines') {
    title = `Deadlines for ${groupName}`;
    icon = '📅';
    
    // Flatten all deadlines from all messages
    const allDeadlines = result.results?.flatMap(r => r.deadlines || []) || [];

    if (allDeadlines.length === 0) {
      content = (
        <div className="text-center py-4">
          <p className="text-lg font-medium theme-text">No Deadlines Found!</p>
          <p className="text-sm theme-text-secondary">The AI did not extract any concrete deadlines from the conversation.</p>
        </div>
      );
    } else {
      content = (
        <div className="space-y-4">
          <p className="text-sm theme-text-secondary">
            {/* FIX 2: Use snake_case for total messages count */}
            {allDeadlines.length} deadline(s) found across {result.total_messages} messages.
          </p>
          <div className="space-y-3 overflow-y-auto max-h-[50vh]">
            {allDeadlines.map((item, index) => (
              <div 
                key={index} 
                className={`p-3 rounded-lg border shadow-sm ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-200'}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className={`text-xs font-semibold uppercase tracking-wider ${theme.id.includes('neon') ? 'text-neon-cyan' : 'text-blue-500'}`}>
                    {/* FIX 3: Use item.parsed_date (or item.date_text as fallback) */}
                    {item.parsed_date || item.date_text || 'DATE MISSING'}
                  </span>
                  <span className="text-xs theme-text-muted">
                    {/* FIX 4: Use item.sender_name */}
                    {item.sender_name}
                  </span>
                </div>
                <p className="text-sm theme-text font-medium mb-2">
                  {/* FIX 5: Use item.context */}
                  {item.context}
                </p>
                <p className="text-xs italic theme-text-secondary overflow-hidden text-ellipsis whitespace-nowrap">
                  {/* FIX 6: Use item.message_content */}
                  "{(item.message_content || '').replace(/\s+/g, ' ').trim()}"
                </p>
              </div>
            ))}
          </div>
        </div>
      );
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div 
        className={`rounded-xl shadow-2xl max-w-lg w-full ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}
        style={{ borderColor: colors.border }}
      >
        {/* Header */}
        <div className={`p-6 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center justify-between">
            <h2 className={`text-xl font-semibold theme-text flex items-center gap-3`}>
              <span className="text-2xl">{icon}</span>
              {title}
            </h2>
            <button
              onClick={onClose}
              className={`text-2xl ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-400 hover:text-gray-900'}`}
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {content}
        </div>

        {/* Footer */}
        <div className={`p-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} flex justify-end`}>
          <button
            onClick={onClose}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${isDarkMode ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'bg-blue-500 hover:bg-blue-600 text-white'}`}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AiResultModal;