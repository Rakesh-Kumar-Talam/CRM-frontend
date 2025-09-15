import React, { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { Sparkles, Shield, Zap, Users, Target, BarChart3, ChevronRight } from 'lucide-react';

const Login: React.FC = () => {
  const { isAuthenticated, loginWithGoogle, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) {
      console.log('Login: User is authenticated, navigating to /');
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  // Handle Google OAuth callback
  useEffect(() => {
    console.log('Login: Current URL:', window.location.href);
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const user = urlParams.get('user');
    const error = urlParams.get('error');
    const errorDescription = urlParams.get('error_description');

    if (error) {
      toast.error(`OAuth Error: ${errorDescription || error}`);
      // Clean up URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (token && user) {
      try {
        // const userData = JSON.parse(decodeURIComponent(user));
        toast.success('Successfully signed in with Google!');
        // Clean up URL parameters
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (error) {
        console.error('Error handling Google OAuth callback:', error);
        toast.error('Error processing OAuth callback');
      }
    }
  }, []);

  const handleGoogleLogin = () => {
    loginWithGoogle();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-purple-400 to-blue-400 rounded-full opacity-20 blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full opacity-20 blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-pink-400 to-purple-400 rounded-full opacity-10 blur-3xl"></div>
      </div>

      <div className="max-w-6xl w-full grid lg:grid-cols-2 gap-12 items-center relative z-10">
        {/* Left side - Branding and Features */}
        <div className="text-center lg:text-left space-y-8">
          {/* Logo and Brand */}
          <div className="space-y-6">
            <div className="flex items-center justify-center lg:justify-start space-x-4">
              <div className="h-16 w-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  CRM Pro
                </h1>
                <p className="text-lg text-gray-600">Business Suite</p>
              </div>
            </div>
            
            <h2 className="text-5xl font-extrabold text-gray-900 leading-tight">
              Welcome to the
              <span className="block bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Future of CRM
              </span>
            </h2>
            
            <p className="text-xl text-gray-600 max-w-lg mx-auto lg:mx-0">
              Streamline your business operations with our powerful, AI-driven customer relationship management platform.
            </p>
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-2 gap-6 max-w-lg mx-auto lg:mx-0">
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
              <div className="h-12 w-12 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl flex items-center justify-center mb-4">
                <Users className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Customer Management</h3>
              <p className="text-sm text-gray-600">Organize and track all your customer interactions</p>
            </div>

            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
              <div className="h-12 w-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center mb-4">
                <Target className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Smart Campaigns</h3>
              <p className="text-sm text-gray-600">Create targeted marketing campaigns</p>
            </div>

            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
              <div className="h-12 w-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mb-4">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Analytics</h3>
              <p className="text-sm text-gray-600">Get insights with advanced reporting</p>
            </div>

            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
              <div className="h-12 w-12 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center mb-4">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">AI Powered</h3>
              <p className="text-sm text-gray-600">Leverage AI for better decisions</p>
            </div>
          </div>
        </div>

        {/* Right side - Login Card */}
        <div className="flex justify-center lg:justify-end">
          <div className="w-full max-w-md">
            <div className="bg-white/80 backdrop-blur-xl shadow-2xl rounded-3xl border border-white/20 p-8">
              <div className="text-center mb-8">
                <div className="h-16 w-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Sparkles className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Get Started</h3>
                <p className="text-gray-600">Sign in with your Google account to continue</p>
              </div>

              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full group relative flex justify-center items-center px-6 py-4 border border-gray-200 rounded-2xl shadow-lg bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-xl hover:scale-[1.02]"
              >
                <svg className="w-6 h-6 mr-3" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span className="font-semibold">
                  {loading ? 'Signing in...' : 'Continue with Google'}
                </span>
                <ChevronRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-200" />
              </button>

              {/* Security Badge */}
              <div className="mt-6 flex items-center justify-center space-x-2 text-sm text-gray-500">
                <Shield className="h-4 w-4" />
                <span>Secure OAuth 2.0 Authentication</span>
              </div>
            </div>

            {/* Additional Info */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                By signing in, you agree to our{' '}
                <a href="#" className="text-purple-600 hover:text-purple-700 font-medium">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="#" className="text-purple-600 hover:text-purple-700 font-medium">
                  Privacy Policy
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;