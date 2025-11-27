import React, { createContext, useContext, useState, useEffect } from 'react';
import { themes, getThemeById } from '../styles/themes';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  // Initialize theme from localStorage or default to first theme
  const [currentThemeId, setCurrentThemeId] = useState(() => {
    const saved = localStorage.getItem('themeId');
    if (saved && themes.find(t => t.id === saved)) {
      return saved;
    }
    // Fallback to legacy 'theme' key if 'themeId' not found
    const legacyTheme = localStorage.getItem('theme');
    if (legacyTheme === 'dark') return 'dark-neon';

    // Default to system preference
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark-neon';
    }
    return 'light-crystal';
  });

  const currentTheme = getThemeById(currentThemeId);
  const isDarkMode = currentTheme.type === 'dark';

  const setTheme = (themeId) => {
    if (themes.find(t => t.id === themeId)) {
      setCurrentThemeId(themeId);
    }
  };

  const toggleTheme = () => {
    // Simple toggle between defaults if user clicks a toggle button
    if (isDarkMode) {
      setTheme('light-crystal');
    } else {
      setTheme('dark-neon');
    }
  };

  // Apply theme variables to root
  useEffect(() => {
    const root = document.documentElement;
    const theme = getThemeById(currentThemeId);

    // Apply CSS variables
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(key, value);
    });

    // Update class for Tailwind dark mode
    if (theme.type === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Save to localStorage
    localStorage.setItem('themeId', currentThemeId);
    localStorage.setItem('theme', theme.type); // For legacy compatibility

  }, [currentThemeId]);

  const value = {
    theme: currentTheme,
    currentThemeId,
    isDarkMode,
    toggleTheme,
    setTheme,
    availableThemes: themes,
    colors: {
      // Map to CSS variables for usage in JS
      background: 'var(--bg-primary)',
      surface: 'var(--bg-secondary)',
      surfaceSecondary: 'var(--bg-tertiary)',
      text: 'var(--text-primary)',
      textSecondary: 'var(--text-secondary)',
      textMuted: 'var(--text-muted)',
      border: 'var(--border-primary)',
      borderSecondary: 'var(--border-secondary)',
      primary: 'var(--accent-primary)',
      primaryHover: 'var(--accent-hover)',
      glass: 'var(--glass-bg)',
      glassBorder: 'var(--glass-border)',
    }
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
