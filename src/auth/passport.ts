// Mock implementation for frontend - replace with actual backend implementation
// import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
// import { Request } from 'express';
import { GoogleOAuthProfile, User } from '../types';

// Mock Request type for frontend
interface Request {
  session?: {
    redirectUrl?: string;
    oauthState?: string;
  };
}

// Mock GoogleStrategy for frontend
class MockGoogleStrategy {
  constructor(config: any, callback: Function) {
    // Mock implementation
  }
}

const GoogleStrategy = MockGoogleStrategy;

// Mock user database - replace with actual database
const users: User[] = [];

// Enhanced Google OAuth Strategy
export const googleStrategy = new GoogleStrategy(
  {
    clientID: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackURL: process.env.GOOGLE_CALLBACK_URL || 'https://crm-backend-yn3q.onrender.com/api/auth/google/callback',
    passReqToCallback: true,
  },
  async (req: Request, accessToken: string, refreshToken: string, profile: GoogleOAuthProfile, done: Function) => {
    try {
      console.log('Google OAuth Strategy - Profile received:', {
        id: profile.id,
        displayName: profile.displayName,
        email: profile.emails?.[0]?.value,
        verified: profile.emails?.[0]?.verified,
        provider: profile.provider
      });

      // Extract email and verification status
      const email = profile.emails?.[0]?.value;
      const emailVerified = profile.emails?.[0]?.verified || false;
      const profilePicture = profile.photos?.[0]?.value;

      if (!email) {
        console.error('Google OAuth Strategy - No email found in profile');
        return done(new Error('No email found in Google profile'), null);
      }

      // Check if email is verified - STRICT VALIDATION
      if (!emailVerified) {
        console.warn('🚨 SECURITY: Google OAuth Strategy - Email not verified:', email);
        console.warn('🚨 SECURITY: User attempted to authenticate with unverified email');
        return done(new Error('Google email not verified. Please verify your email with Google first.'), null);
      }

      // Gmail-specific validation
      const isGmail = email.endsWith('@gmail.com') || email.endsWith('@googlemail.com');
      if (!isGmail) {
        console.warn('🚨 SECURITY: Google OAuth Strategy - Non-Gmail email attempted:', email);
        return done(new Error('Only Gmail accounts are supported. Please use a Gmail account for authentication.'), null);
      }

      // Look for existing user by Google ID or email
      let user = users.find(u => u.google_id === profile.id || u.email === email);

      if (user) {
        // Update existing user with latest Google data - ENHANCED VALIDATION
        console.log('Google OAuth Strategy - Updating existing user:', user.email);
        
        // Ensure user has Google ID (security check)
        if (!user.google_id) {
          console.warn('🚨 SECURITY: User exists but has no Google ID - updating:', user.email);
        }
        
        user.google_id = profile.id;
        user.name = profile.displayName;
        user.profile_picture = profilePicture;
        user.email_verified = emailVerified;
        user.last_login = new Date().toISOString();

        // Update user in database (replace with actual database update)
        const userIndex = users.findIndex(u => u.id === user!.id);
        if (userIndex !== -1) {
          users[userIndex] = user;
        }

        console.log('✅ Google OAuth Strategy - User updated successfully:', user.email);
        return done(null, user);
      } else {
        // Create new user - ENHANCED VALIDATION
        console.log('Google OAuth Strategy - Creating new user for email:', email);
        
        const newUser: User = {
          id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          email: email,
          username: email.split('@')[0], // Use email prefix as username
          name: profile.displayName,
          profile_picture: profilePicture,
          email_verified: emailVerified,
          google_id: profile.id, // REQUIRED - All users must have Google ID
          last_login: new Date().toISOString()
        };

        // Save user to database (replace with actual database save)
        users.push(newUser);

        console.log('✅ Google OAuth Strategy - New user created successfully:', newUser.email);
        return done(null, newUser);
      }
    } catch (error) {
      console.error('Google OAuth Strategy - Error processing profile:', error);
      return done(error, null);
    }
  }
);

// User serialization for sessions
export const serializeUser = (user: User, done: Function) => {
  try {
    console.log('Serializing user:', user.email);
    done(null, user.id);
  } catch (error) {
    console.error('Error serializing user:', error);
    done(error, null);
  }
};

// User deserialization for sessions
export const deserializeUser = (id: string, done: Function) => {
  try {
    console.log('Deserializing user with ID:', id);
    const user = users.find(u => u.id === id);
    
    if (user) {
      console.log('User found:', user.email);
      done(null, user);
    } else {
      console.log('User not found with ID:', id);
      done(null, false);
    }
  } catch (error) {
    console.error('Error deserializing user:', error);
    done(error, null);
  }
};

// Helper function to get user by Google ID
export const getUserByGoogleId = (googleId: string): User | undefined => {
  return users.find(u => u.google_id === googleId);
};

// Helper function to get user by email
export const getUserByEmail = (email: string): User | undefined => {
  return users.find(u => u.email === email);
};

// Helper function to disconnect Google OAuth
export const disconnectGoogleOAuth = (userId: string): boolean => {
  try {
    const userIndex = users.findIndex(u => u.id === userId);
    if (userIndex !== -1) {
      users[userIndex].google_id = undefined;
      users[userIndex].profile_picture = undefined;
      console.log('Google OAuth disconnected for user:', users[userIndex].email);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error disconnecting Google OAuth:', error);
    return false;
  }
};

// Helper function to check OAuth status
export const getOAuthStatus = (userId: string): { connected: boolean; user?: User } => {
  try {
    const user = users.find(u => u.id === userId);
    if (user && user.google_id) {
      return { connected: true, user };
    }
    return { connected: false };
  } catch (error) {
    console.error('Error checking OAuth status:', error);
    return { connected: false };
  }
};

// Security middleware to validate Google OAuth authentication
export const validateGoogleOAuth = (req: any, res: any, next: any) => {
  try {
    const user = req.user;
    
    if (!user) {
      console.warn('🚨 SECURITY: Unauthenticated access attempt to protected route');
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please use Google OAuth to sign in.',
        error: 'UNAUTHENTICATED'
      });
    }
    
    if (!user.google_id) {
      console.warn('🚨 SECURITY: User without Google ID attempted to access protected route:', user.email);
      return res.status(403).json({
        success: false,
        message: 'Google OAuth authentication required. Please sign in with Google.',
        error: 'GOOGLE_OAUTH_REQUIRED'
      });
    }
    
    if (!user.email_verified) {
      console.warn('🚨 SECURITY: User with unverified email attempted to access protected route:', user.email);
      return res.status(403).json({
        success: false,
        message: 'Email verification required. Please verify your email with Google.',
        error: 'EMAIL_VERIFICATION_REQUIRED'
      });
    }
    
    console.log('✅ SECURITY: Valid Google OAuth user accessing protected route:', user.email);
    next();
  } catch (error) {
    console.error('🚨 SECURITY: Error in Google OAuth validation middleware:', error);
    return res.status(500).json({
      success: false,
      message: 'Authentication validation error',
      error: 'VALIDATION_ERROR'
    });
  }
};
