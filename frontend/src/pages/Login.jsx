import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import ThemeToggle from '../components/ui/ThemeToggle'; 

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const { colors, isDarkMode } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  // Redirect to dashboard if user is already logged in
  useEffect(() => {
    if (user && user.token && user.userId) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate, location.state]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(email, password);
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
    <div className="min-h-screen flex items-center justify-center theme-bg transition-colors duration-500 p-4 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute -top-20 -right-20 w-96 h-96 rounded-full opacity-20 blur-3xl animate-pulse-slow" 
          style={{ 
            background: isDarkMode 
              ? 'radial-gradient(circle, #4f46e5, transparent)' 
              : 'radial-gradient(circle, #c7d2fe, transparent)' 
          }}
        ></div>
        <div 
          className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full opacity-20 blur-3xl animate-pulse-slow" 
          style={{ 
            background: isDarkMode 
              ? 'radial-gradient(circle, #ec4899, transparent)' 
              : 'radial-gradient(circle, #fbcfe8, transparent)',
            animationDelay: '1s'
          }}
        ></div>
      </div>

      <div className="w-full max-w-md mx-auto relative z-10">
        {/* Theme Toggle */}
        <div className="flex justify-center mb-6 animate-fade-in-down">
          <ThemeToggle />
        </div>

        {/* Login Form */}
        <div className="border rounded-2xl py-10 px-8 theme-surface transition-colors duration-500 shadow-2xl glass-effect animate-scale-in hover:shadow-glow">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2 theme-text transition-colors duration-500 tracking-tight">
              Welcome Back
            </h1>
            <p className="text-sm theme-text-secondary transition-colors duration-500">
              Sign in to continue to Echo Chat
            </p>
          </div>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="group">
                <label 
                  htmlFor="email" 
                  className="block text-xs font-semibold mb-2 uppercase tracking-wider transition-colors duration-500 ml-1"
                  style={{ color: colors.textSecondary }}
                >
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="w-full px-4 py-3 border rounded-xl transition-all duration-300 focus:outline-none text-sm focus:ring-2 focus:scale-[1.01]"
                  style={{
                    backgroundColor: colors.surfaceSecondary,
                    borderColor: colors.border,
                    color: colors.text,
                    '--tw-ring-color': colors.primary
                  }}
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              
              <div className="group">
                <label 
                  htmlFor="password" 
                  className="block text-xs font-semibold mb-2 uppercase tracking-wider transition-colors duration-500 ml-1"
                  style={{ color: colors.textSecondary }}
                >
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="w-full px-4 py-3 border rounded-xl transition-all duration-300 focus:outline-none text-sm focus:ring-2 focus:scale-[1.01]"
                  style={{
                    backgroundColor: colors.surfaceSecondary,
                    borderColor: colors.border,
                    color: colors.text,
                    '--tw-ring-color': colors.primary
                  }}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <div 
                className="border p-3 rounded-xl transition-colors duration-500 bg-red-500/10 border-red-500/20 animate-fade-in"
              >
                <p className="text-xs font-medium text-center text-red-500">
                  {error}
                </p>
              </div>
            )}

            <div className="space-y-4 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 font-bold text-sm rounded-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] shadow-lg disabled:opacity-70 disabled:cursor-not-allowed"
                style={{
                  background: `linear-gradient(135deg, ${colors.primary}, ${colors.primaryHover})`,
                  color: '#ffffff',
                  boxShadow: `0 4px 12px ${colors.shadowColor}`
                }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                    Signing in...
                  </span>
                ) : 'Sign In'}
              </button>
            </div>

            <div className="text-center mt-6">
              <p 
                className="text-xs transition-colors duration-500"
                style={{ color: colors.textSecondary }}
              >
                Don't have an account? <a href="/register" className="font-semibold hover:underline" style={{ color: colors.primary }}>Sign up</a>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;