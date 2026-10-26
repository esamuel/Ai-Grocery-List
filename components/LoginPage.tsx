import React, { useState } from 'react';
import { signInUser, signUpUser, resetPassword } from '../services/firebaseService';

interface LoginPageProps {
  onLogin: () => void;
  onDemoMode?: () => void;
  translations: {
    title: string;
    subtitle: string;
    email: string;
    password: string;
    signIn: string;
    signUp: string;
    switchToSignUp: string;
    switchToSignIn: string;
    signingIn: string;
    signingUp: string;
  };
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin, onDemoMode, translations }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        await signUpUser(email.trim(), password);
      } else {
        await signInUser(email.trim(), password);
      }
      onLogin();
    } catch (err: any) {
      console.error('Authentication error:', err);
      let errorMessage = 'Authentication failed';
      
      // Supabase auth error messages / codes
      const code: string = err.code || '';
      const msg: string = err.message || '';
      if (code === 'user_already_exists' || /already registered/i.test(msg)) {
        errorMessage = 'This email is already registered. Try signing in instead.';
      } else if (code === 'weak_password' || /password should be/i.test(msg)) {
        errorMessage = 'Password should be at least 6 characters long.';
      } else if (code === 'validation_failed' || /invalid email|unable to validate email/i.test(msg)) {
        errorMessage = 'Please enter a valid email address.';
      } else if (code === 'invalid_credentials' || /invalid login credentials/i.test(msg)) {
        errorMessage = 'Wrong email or password. Please try again.';
      } else if (code === 'email_not_confirmed' || /email not confirmed/i.test(msg)) {
        errorMessage = 'Please confirm your email first — check your inbox.';
      } else if (code === 'over_request_rate_limit' || /rate limit|too many/i.test(msg)) {
        errorMessage = 'Too many attempts. Please try again later.';
      } else {
        errorMessage = msg || 'Authentication failed';
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError('Please enter your email address first.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      console.log('Attempting to send password reset email to:', email.trim());
      await resetPassword(email.trim());
      console.log('Password reset email sent successfully');
      setResetEmailSent(true);
      setShowForgotPassword(false);
    } catch (err: any) {
      console.error('Password reset error:', err);
      let errorMessage = 'Failed to send reset email.';
      
      if (err.code) {
        switch (err.code) {
          case 'auth/user-not-found':
            errorMessage = 'No account found with this email address.';
            break;
          case 'auth/invalid-email':
            errorMessage = 'Please enter a valid email address.';
            break;
          case 'auth/too-many-requests':
            errorMessage = 'Too many requests. Please try again later.';
            break;
          default:
            errorMessage = err.message || 'Failed to send reset email.';
        }
      }
      
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">{translations.title}</h1>
          <p className="text-gray-600">{translations.subtitle}</p>
        </div>

        {resetEmailSent && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            Password reset email sent! Check your inbox and follow the instructions to reset your password.
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              {translations.email}
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              {translations.password}
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              required
              disabled={isLoading}
              minLength={6}
            />
            {!isSignUp && (
              <div className="mt-2 text-right">
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  disabled={isLoading}
                >
                  Forgot Password?
                </button>
              </div>
            )}
          </div>

          <button
            type="submit"
            className="w-full bg-green-500 text-white font-semibold py-3 px-6 rounded-lg hover:bg-green-600 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
            disabled={isLoading || !email.trim() || !password.trim()}
          >
            {isLoading 
              ? (isSignUp ? translations.signingUp : translations.signingIn)
              : (isSignUp ? translations.signUp : translations.signIn)
            }
          </button>
        </form>

        <div className="mt-6 text-center space-y-3">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
            }}
            className="text-green-600 hover:text-green-700 font-medium block w-full"
            disabled={isLoading}
          >
            {isSignUp ? translations.switchToSignIn : translations.switchToSignUp}
          </button>
          
          {onDemoMode && (
            <div className="border-t pt-3">
              <button
                onClick={onDemoMode}
                className="text-blue-600 hover:text-blue-700 font-medium text-sm"
                disabled={isLoading}
              >
                🚀 Try Demo Mode (Skip Authentication)
              </button>
              <p className="text-xs text-gray-500 mt-1">
                Test the app without an account
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Reset Password</h2>
            <p className="text-gray-600 mb-4">
              Enter your email address and we'll send you a link to reset your password.
            </p>
            
            <div className="mb-4">
              <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="reset-email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="your@email.com"
                disabled={isLoading}
              />
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowForgotPassword(false);
                  setError(null);
                }}
                className="flex-1 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleForgotPassword}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:bg-gray-400"
                disabled={isLoading || !email.trim()}
              >
                {isLoading ? 'Sending...' : 'Send Reset Email'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
