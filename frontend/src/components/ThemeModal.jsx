import React from 'react';
import ReactDOM from 'react-dom';
import ThemeSelector from './ThemeSelector';
import { useTheme } from '../context/ThemeContext';

const ThemeModal = ({ isOpen, onClose }) => {
    const { colors, isDarkMode } = useTheme();

    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div
                className="w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200"
                style={{
                    backgroundColor: colors.surface,
                    border: `1px solid ${colors.border}`
                }}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b theme-border">
                    <h2 className="text-lg font-bold theme-text flex items-center gap-2">
                        <span>🎨</span> Theme Settings
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors theme-text"
                    >
                        ✕
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 max-h-[70vh] overflow-y-auto">
                    <ThemeSelector />
                </div>


            </div>
        </div>,
        document.body
    );
};

export default ThemeModal;
