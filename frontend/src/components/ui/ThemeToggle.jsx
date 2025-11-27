import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import ThemeModal from '../ThemeModal';

const ThemeToggle = () => {
  const { isDarkMode, colors } = useTheme();
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="p-2 rounded-full transition-all duration-300 hover-scale group relative"
        style={{
          backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
          border: `2px solid ${isDarkMode ? '#ffffff' : '#000000'}`,
          color: isDarkMode ? '#ffffff' : '#000000'
        }}
        title="Change Theme"
      >
        <span className="text-lg">🎨</span>
      </button>

      <ThemeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
};

export default ThemeToggle;






