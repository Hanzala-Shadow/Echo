export const themes = [
  // Light Themes
  {
    id: 'light-crystal',
    name: 'Crystal Clear',
    type: 'light',
    colors: {
      '--bg-primary': '#ffffff',
      '--bg-secondary': '#f3f4f6',
      '--bg-tertiary': '#e5e7eb',
      '--text-primary': '#111827',
      '--text-secondary': '#4b5563',
      '--text-muted': '#9ca3af',
      '--border-primary': '#e5e7eb',
      '--border-secondary': '#d1d5db',
      '--accent-primary': '#3b82f6',
      '--accent-hover': '#2563eb',
      '--glass-bg': 'rgba(255, 255, 255, 0.8)',
      '--glass-border': 'rgba(255, 255, 255, 0.5)',
      '--shadow-color': 'rgba(0, 0, 0, 0.05)',
    }
  },
  {
    id: 'light-aurora',
    name: 'Soft Aurora',
    type: 'light',
    colors: {
      '--bg-primary': '#fffbf5',
      '--bg-secondary': '#f7f0e6',
      '--bg-tertiary': '#ebe0d1',
      '--text-primary': '#4a3b2a',
      '--text-secondary': '#85705a',
      '--text-muted': '#b09b85',
      '--border-primary': '#e3d5c3',
      '--border-secondary': '#d1c0aa',
      '--accent-primary': '#d97706',
      '--accent-hover': '#b45309',
      '--glass-bg': 'rgba(255, 251, 245, 0.7)',
      '--glass-border': 'rgba(227, 213, 195, 0.4)',
      '--shadow-color': 'rgba(74, 59, 42, 0.08)',
    }
  },
  {
    id: 'light-mint',
    name: 'Mint Fresh',
    type: 'light',
    colors: {
      '--bg-primary': '#f0fdfa',
      '--bg-secondary': '#ccfbf1',
      '--bg-tertiary': '#99f6e4',
      '--text-primary': '#134e4a',
      '--text-secondary': '#0f766e',
      '--text-muted': '#2dd4bf',
      '--border-primary': '#5eead4',
      '--border-secondary': '#2dd4bf',
      '--accent-primary': '#0d9488',
      '--accent-hover': '#0f766e',
      '--glass-bg': 'rgba(240, 253, 250, 0.75)',
      '--glass-border': 'rgba(153, 246, 228, 0.4)',
      '--shadow-color': 'rgba(19, 78, 74, 0.1)',
    }
  },
  // Dark Themes
  {
    id: 'dark-neon',
    name: 'Neon Cyberpunk',
    type: 'dark',
    colors: {
      '--bg-primary': '#050505',
      '--bg-secondary': '#121212',
      '--bg-tertiary': '#1e1e1e',
      '--text-primary': '#ffffff',
      '--text-secondary': '#a3a3a3',
      '--text-muted': '#525252',
      '--border-primary': '#333333',
      '--border-secondary': '#404040',
      '--accent-primary': '#00ff9d',
      '--accent-hover': '#00cc7d',
      '--glass-bg': 'rgba(18, 18, 18, 0.8)',
      '--glass-border': 'rgba(0, 255, 157, 0.2)',
      '--shadow-color': 'rgba(0, 255, 157, 0.15)',
    }
  },
  {
    id: 'dark-velvet',
    name: 'Midnight Velvet',
    type: 'dark',
    colors: {
      '--bg-primary': '#0f0c29',
      '--bg-secondary': '#1a163a',
      '--bg-tertiary': '#241e4d',
      '--text-primary': '#e0e7ff',
      '--text-secondary': '#a5b4fc',
      '--text-muted': '#6366f1',
      '--border-primary': '#312e81',
      '--border-secondary': '#4338ca',
      '--accent-primary': '#818cf8',
      '--accent-hover': '#6366f1',
      '--glass-bg': 'rgba(26, 22, 58, 0.7)',
      '--glass-border': 'rgba(129, 140, 248, 0.2)',
      '--shadow-color': 'rgba(129, 140, 248, 0.15)',
    }
  },
  {
    id: 'dark-space',
    name: 'Deep Space',
    type: 'dark',
    colors: {
      '--bg-primary': '#0f172a',
      '--bg-secondary': '#1e293b',
      '--bg-tertiary': '#334155',
      '--text-primary': '#f8fafc',
      '--text-secondary': '#94a3b8',
      '--text-muted': '#64748b',
      '--border-primary': '#334155',
      '--border-secondary': '#475569',
      '--accent-primary': '#38bdf8',
      '--accent-hover': '#0ea5e9',
      '--glass-bg': 'rgba(30, 41, 59, 0.8)',
      '--glass-border': 'rgba(56, 189, 248, 0.2)',
      '--shadow-color': 'rgba(56, 189, 248, 0.1)',
    }
  }
];

export const getThemeById = (id) => themes.find(t => t.id === id) || themes[0];
