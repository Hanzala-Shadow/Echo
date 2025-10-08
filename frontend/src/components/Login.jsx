import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import ThemeToggle from '../ThemeToggle';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const { colors, isDarkMode } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  console.log('=== LOGIN COMPONENT DEBUG ===');
  console.log('Login component - current location:', location);
  console.log('Login component - user state:', user);

  // Redirect to dashboard if user is already logged in
  useEffect(() => {
    console.log('Login useEffect - user:', user);
    console.log('Login useEffect - location state:', location.state);
    
    if (user && user.token && user.userId) {
      console.log('Login - user already logged in, redirecting to dashboard');
      // Use replace to avoid back button issues
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate, location.state]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      console.log('Login - attempting to login with:', { email, password });
      const userData = await login(email, password);
      console.log('Login - login successful, user:', userData);
      console.log('Login - about to navigate to dashboard');
      // Navigate immediately after successful login
      navigate('/dashboard', { replace: true });
    } catch (err) {
      console.error('Login - error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center theme-bg transition-colors duration-500 p-4">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden">
        <div 
          className="absolute -top-20 -right-20 w-40 h-40 rounded-full opacity-20 animate-float" 
          style={{ 
            background: isDarkMode 
              ? 'linear-gradient(45deg, #ffffff, #e5e7eb)' 
              : 'linear-gradient(45deg, #000000, #374151)' 
          }}
        ></div>
        <div 
          className="absolute -bottom-20 -left-20 w-40 h-40 rounded-full opacity-20 animate-float-delayed" 
          style={{ 
            background: isDarkMode 
              ? 'linear-gradient(45deg, #ffffff, #e5e7eb)' 
              : 'linear-gradient(45deg, #000000, #374151)' 
          }}
        ></div>
      </div>

      <div className="w-full max-w-md mx-auto relative z-10">
        {/* Theme Toggle */}
        <div className="flex justify-center mb-6 fade-in">
          <ThemeToggle />
        </div>

        {/* Login Form */}
        <div className="border rounded-2xl py-8 px-6 theme-surface transition-colors duration-500 shadow-xl glass-effect slide-up hover-scale">
          <div className="text-center mb-8 fade-in">
            <h1 className="text-2xl font-bold mb-2 theme-text transition-colors duration-500">
              WELCOME BACK
            </h1>
            <p className="text-xs theme-text-secondary transition-colors duration-500">
              Sign in to continue to Echo Chat
            </p>
          </div>
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label 
                  htmlFor="email" 
                  className="block text-xs font-medium mb-2 uppercase tracking-wider transition-colors duration-500"
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
                  className="w-full px-3 py-3 border rounded-xl transition-all duration-500 focus:outline-none text-sm hover-scale"
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
                  className="block text-xs font-medium mb-2 uppercase tracking-wider transition-colors duration-500"
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
                  className="w-full px-3 py-3 border rounded-xl transition-all duration-500 focus:outline-none text-sm hover-scale"
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
                className="border p-3 rounded-xl transition-colors duration-500"
                style={{
                  backgroundColor: colors.surfaceSecondary,
                  borderColor: colors.border
                }}
              >
                <p 
                  className="text-xs transition-colors duration-500"
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
                className="w-full py-3 px-4 border font-medium transition-all duration-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm rounded-xl hover-scale theme-button"
              >
                {loading ? 'SIGNING IN...' : 'SIGN IN'}
              </button>
            </div>

            <div className="text-center mt-6 space-y-3 fade-in">
              <p 
                className="text-xs transition-colors duration-500"
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