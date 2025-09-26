import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import ThemeToggle from '../ThemeToggle';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { colors, isDarkMode } = useTheme();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError('');
    setLoading(true);

    try {
      await login('alice@example.com', 'StrongPass123!');
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center theme-bg transition-colors duration-500">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden">
        <div 
          className="absolute -top-40 -right-40 w-80 h-80 rounded-full opacity-20 animate-float" 
          style={{ 
            background: isDarkMode 
              ? 'linear-gradient(45deg, #ffffff, #e5e7eb)' 
              : 'linear-gradient(45deg, #000000, #374151)' 
          }}
        ></div>
        <div 
          className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full opacity-20 animate-float-delayed" 
          style={{ 
            background: isDarkMode 
              ? 'linear-gradient(45deg, #ffffff, #e5e7eb)' 
              : 'linear-gradient(45deg, #000000, #374151)' 
          }}
        ></div>
      </div>

      <div className="w-full max-w-md mx-auto relative z-10">
        {/* Theme Toggle */}
        <div className="flex justify-center mb-8 fade-in">
          <ThemeToggle />
        </div>

        {/* Login Form */}
        <div className="border-2 rounded-2xl py-10 px-8 theme-surface transition-colors duration-500 shadow-2xl glass-effect slide-up hover-scale">
          <div className="text-center mb-10 fade-in">
            <h1 className="text-3xl font-bold mb-3 theme-text transition-colors duration-500">
              WELCOME BACK
            </h1>
            <p className="text-sm theme-text-secondary transition-colors duration-500">
              Sign in to continue to Echo Chat
            </p>
          </div>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label 
                  htmlFor="email" 
                  className="block text-sm font-medium mb-3 uppercase tracking-wider transition-colors duration-500"
                  style={{ color: colors.text }}
                >
                  EMAIL ADDRESS
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="w-full px-4 py-4 border-2 rounded-xl transition-all duration-500 focus:outline-none text-sm hover-scale"
                  style={{
                    backgroundColor: colors.surfaceSecondary,
                    borderColor: colors.border,
                    color: colors.text
                  }}
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              
              <div>
                <label 
                  htmlFor="password" 
                  className="block text-sm font-medium mb-3 uppercase tracking-wider transition-colors duration-500"
                  style={{ color: colors.text }}
                >
                  PASSWORD
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="w-full px-4 py-4 border-2 rounded-xl transition-all duration-500 focus:outline-none text-sm hover-scale"
                  style={{
                    backgroundColor: colors.surfaceSecondary,
                    borderColor: colors.border,
                    color: colors.text
                  }}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div 
                className="border-2 p-4 rounded-xl transition-colors duration-500"
                style={{
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.border
                }}
              >
                <p 
                  className="text-sm transition-colors duration-500"
                  style={{ color: colors.error }}
                >
                  {error}
                </p>
              </div>
            )}

            <div className="space-y-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 px-6 border-2 font-medium transition-all duration-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm rounded-xl hover-scale theme-button"
              >
                {loading ? 'SIGNING IN...' : 'SIGN IN'}
              </button>
              
              <button
                type="button"
                onClick={handleDemoLogin}
                disabled={loading}
                className="w-full py-3 px-6 border-2 font-medium transition-all duration-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm rounded-xl hover-scale"
                style={{
                  backgroundColor: 'transparent',
                  borderColor: colors.border,
                  color: colors.text
                }}
              >
                {loading ? 'DEMO LOGIN...' : '🚀 DEMO LOGIN'}
              </button>
            </div>

            <div className="text-center mt-8 space-y-3 fade-in">
              <p 
                className="text-sm transition-colors duration-500"
                style={{ color: colors.textSecondary }}
              >
                Or use demo credentials: alice@example.com / StrongPass123!
              </p>
              <p 
                className="text-sm transition-colors duration-500"
                style={{ color: colors.textSecondary }}
              >
                Don't have an account? <a href="/register" className="underline">Sign up</a>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
