import React from 'react';
import { useTheme } from '../context/ThemeContext';

const ThemeSelector = () => {
    const { availableThemes, currentThemeId, setTheme, colors } = useTheme();

    return (
        <div className="space-y-4">
            <h3 className="text-sm font-medium theme-text-secondary uppercase tracking-wider px-2">
                Appearance
            </h3>

            <div className="grid grid-cols-1 gap-3 px-2">
                {availableThemes.map((theme) => (
                    <button
                        key={theme.id}
                        onClick={() => setTheme(theme.id)}
                        className={`relative group flex items-center gap-4 p-3 rounded-xl transition-all duration-200 border-2 text-left ${currentThemeId === theme.id
                                ? 'border-blue-500 shadow-md scale-[1.02]'
                                : 'border-transparent hover:border-gray-200 dark:hover:border-gray-700 hover:bg-black/5 dark:hover:bg-white/5'
                            }`}
                        style={{
                            backgroundColor: currentThemeId === theme.id ? colors.surface : 'transparent'
                        }}
                    >
                        {/* Theme Preview Circle */}
                        <div className="relative h-12 w-12 rounded-full shadow-sm shrink-0 overflow-hidden border border-gray-200 dark:border-gray-700">
                            <div
                                className="absolute inset-0"
                                style={{ backgroundColor: theme.colors['--bg-primary'] }}
                            />
                            <div
                                className="absolute bottom-0 right-0 w-3/4 h-3/4 rounded-tl-full"
                                style={{ backgroundColor: theme.colors['--bg-secondary'] }}
                            />
                            <div
                                className="absolute bottom-0 right-0 w-1/2 h-1/2 rounded-tl-full"
                                style={{ backgroundColor: theme.colors['--accent-primary'] }}
                            />
                        </div>

                        {/* Theme Info */}
                        <div className="flex-1">
                            <div className="flex items-center justify-between">
                                <span className="font-medium theme-text">
                                    {theme.name}
                                </span>
                                {currentThemeId === theme.id && (
                                    <span className="text-blue-500 text-lg">✓</span>
                                )}
                            </div>
                            <span className="text-xs theme-text-secondary capitalize">
                                {theme.type} mode
                            </span>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default ThemeSelector;
