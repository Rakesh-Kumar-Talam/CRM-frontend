import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi } from '../services/api';
import { User, GoogleOAuthStatus } from '../types';

interface AuthContextType {
  isAuthenticated: boolean;
  token: string | null;
  user: User | null;
  loginWithGoogle: () => void;
  logout: () => void;
  checkGoogleOAuthStatus: () => Promise<GoogleOAuthStatus>;
  disconnectGoogleOAuth: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken) {
      setToken(storedToken);
    }
    
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Error parsing stored user:', error);
        localStorage.removeItem('user');
      }
    }
    
    setLoading(false);
  }, []);

  // Handle Google OAuth callback from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');
    const userParam = urlParams.get('user');
    const error = urlParams.get('error');
    const errorDescription = urlParams.get('error_description');
    
    if (error) {
      console.error('OAuth Error:', errorDescription || error);
      // Clean up URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (tokenParam && userParam) {
      try {
        const userData = JSON.parse(decodeURIComponent(userParam));
        console.log('OAuth callback - User data:', userData);
        
        setToken(tokenParam);
        setUser(userData);
        localStorage.setItem('authToken', tokenParam);
        localStorage.setItem('user', JSON.stringify(userData));
        
        // Clean up URL parameters
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (error) {
        console.error('Error handling Google OAuth callback:', error);
      }
    }
  }, []);


  const loginWithGoogle = () => {
    const backendUrl = process.env.REACT_APP_API_URL || 'https://crm-backend-yn3q.onrender.com/api';
    const redirectUrl = `${backendUrl}/auth/google?redirect=${encodeURIComponent(window.location.origin)}`;
    window.location.href = redirectUrl;
  };

  const checkGoogleOAuthStatus = async (): Promise<GoogleOAuthStatus> => {
    try {
      const response = await authApi.checkGoogleOAuthStatus();
      return response;
    } catch (error) {
      console.error('Error checking Google OAuth status:', error);
      return { connected: false };
    }
  };

  const disconnectGoogleOAuth = async (): Promise<void> => {
    try {
      if (user?.id) {
        await authApi.disconnectGoogleOAuth(user.id);
        // Update user to remove Google OAuth data
        const updatedUser = { ...user, google_id: undefined, profile_picture: undefined };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
    } catch (error) {
      console.error('Error disconnecting Google OAuth:', error);
      throw error;
    }
  };


  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  };

  const value = {
    isAuthenticated: !!token,
    token,
    user,
    loginWithGoogle,
    logout,
    checkGoogleOAuthStatus,
    disconnectGoogleOAuth,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};



