import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import ThemeToggle from '../components/ui/ThemeToggle'; // UPDATED

const Register = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { register } = useAuth();  //newly added
  const { colors, isDarkMode } = useTheme();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // In Register.jsx, update the handleSubmit function:
const handleSubmit = async (e) => {
  e.preventDefault();
  setLoading(true);
  setError('');

  if (formData.password !== formData.confirmPassword) {
    setError('Passwords do not match');
    setLoading(false);
    return;
  }

  try {
    const result = await register(formData.username, formData.email, formData.password); // or auto-login and send to dashboard
    // await login(formData.email, formData.password);   // depends on what you want to do; straight to dashboard or to login page (marzi) default preferred
    // navigate('/dashboard');
    
    if (result.success) {
      // Show success message and redirect to login
      setError(`✅ ${result.message}`);
      setTimeout(() => navigate('/login'), 2000);
    }
    
  } catch (err) {
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

        {/* Register Form */}
        <div className="border rounded-2xl py-8 px-6 theme-surface transition-colors duration-500 shadow-xl glass-effect slide-up hover-scale">
          <div className="text-center mb-8 fade-in">
            <h1 className="text-2xl font-bold mb-2 theme-text transition-colors duration-500">
              CREATE ACCOUNT
            </h1>
            <p className="text-xs theme-text-secondary transition-colors duration-500">
              Join Echo Chat today
            </p>
          </div>
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div>
                <label 
                  htmlFor="username" 
                  className="block text-xs font-medium mb-2 uppercase tracking-wider transition-colors duration-500"
                  style={{ color: colors.text }}
                >
                  USERNAME
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  className="w-full px-3 py-3 border rounded-xl transition-all duration-500 focus:outline-none text-sm hover-scale"
                  style={{
                    backgroundColor: colors.surfaceSecondary,
                    borderColor: colors.border,
                    color: colors.text
                  }}
                  placeholder="Enter username"
                  value={formData.username}
                  onChange={handleChange}
                />
              </div>

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
                  value={formData.email}
                  onChange={handleChange}
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
                  autoComplete="new-password"
                  required
                  className="w-full px-3 py-3 border rounded-xl transition-all duration-500 focus:outline-none text-sm hover-scale"
                  style={{
                    backgroundColor: colors.surfaceSecondary,
                    borderColor: colors.border,
                    color: colors.text
                  }}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label 
                  htmlFor="confirmPassword" 
                  className="block text-xs font-medium mb-2 uppercase tracking-wider transition-colors duration-500"
                  style={{ color: colors.text }}
                >
                  CONFIRM PASSWORD
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  className="w-full px-3 py-3 border rounded-xl transition-all duration-500 focus:outline-none text-sm hover-scale"
                  style={{
                    backgroundColor: colors.surfaceSecondary,
                    borderColor: colors.border,
                    color: colors.text
                  }}
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleChange}
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
                {loading ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT'}
              </button>
            </div>

            <div className="text-center mt-6 space-y-3 fade-in">
              <p 
                className="text-xs transition-colors duration-500"
                style={{ color: colors.textSecondary }}
              >
                Already have an account? <a href="/login" className="underline">Sign in</a>
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Register;