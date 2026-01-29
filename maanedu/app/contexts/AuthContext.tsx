'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { getUserSupabaseClient, clearUserSupabaseClient, testUserSupabaseConnection } from '../lib/dynamicSupabase';
import { SupabaseClient } from '@supabase/supabase-js';

interface AuthContextType {
  currentUserId: string | null;
  supabaseClient: SupabaseClient | null;
  isLoading: boolean;
  error: string | null;
  login: (userId: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  retryInitialization: () => Promise<void>;
  simpleInitializeUser: (userId: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [supabaseClient, setSupabaseClient] = useState<SupabaseClient | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initializeUser = async (userId: string) => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('AuthContext - Starting user initialization for:', userId);
      
      // Get user-specific Supabase client
      const client = await getUserSupabaseClient(userId);
      console.log('AuthContext - Got Supabase client:', !!client);
      
      if (!client) {
        throw new Error('Failed to create Supabase client');
      }
      
      // Set the user state first, even before connection test
      setCurrentUserId(userId);
      setSupabaseClient(client);
      localStorage.setItem('currentUserId', userId);
      
      console.log('AuthContext - User state set, testing connection...');
      
      // Test connection in background (don't fail if this fails)
      try {
        const isConnected = await testUserSupabaseConnection(userId);
        console.log('AuthContext - Connection test result:', isConnected);
        
        if (!isConnected) {
          console.warn('AuthContext - Connection test failed, but keeping user logged in');
          setError('Database connection test failed, but you can still use the app');
        }
      } catch (testError) {
        console.warn('AuthContext - Connection test error, but keeping user logged in:', testError);
        setError('Database connection test failed, but you can still use the app');
      }
      
      console.log('AuthContext - User initialized successfully:', userId);
    } catch (err) {
      console.error('AuthContext - Error initializing user:', err);
      setError(err instanceof Error ? err.message : 'Failed to initialize user');
      
      // Only logout if it's a critical error (can't get Supabase client)
      if (err instanceof Error && (err.message.includes('Failed to create Supabase client') || err.message.includes('No Supabase configuration found'))) {
        console.log('AuthContext - Critical error, clearing auth state');
        logout(); // Clear any partial state
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Check for saved user on mount
  useEffect(() => {
    const savedUserId = localStorage.getItem('currentUserId');
    console.log('AuthContext - Checking saved user:', savedUserId);
    
    if (savedUserId) {
      console.log('AuthContext - Found saved user, initializing:', savedUserId);
      
      // Set loading to true immediately
      setIsLoading(true);
      
      // Initialize user
      initializeUser(savedUserId);
      
      // Add a timeout to prevent infinite loading
      const timeout = setTimeout(() => {
        console.log('AuthContext - Initialization timeout, setting loading to false');
        setIsLoading(false);
      }, 15000); // 15 second timeout
      
      return () => clearTimeout(timeout);
    } else {
      console.log('AuthContext - No saved user found');
      setIsLoading(false); // Set loading to false if no saved user
    }
  }, []);

  // Add a retry mechanism for failed initializations
  const retryInitialization = async () => {
    const savedUserId = localStorage.getItem('currentUserId');
    if (savedUserId) {
      console.log('AuthContext - Retrying initialization for:', savedUserId);
      await initializeUser(savedUserId);
    }
  };

  // Simple initialization without connection test (fallback)
  const simpleInitializeUser = async (userId: string) => {
    try {
      console.log('AuthContext - Simple initialization for:', userId);
      const client = await getUserSupabaseClient(userId);
      
      if (client) {
        setCurrentUserId(userId);
        setSupabaseClient(client);
        localStorage.setItem('currentUserId', userId);
        console.log('AuthContext - Simple initialization successful');
        return true;
      }
      return false;
    } catch (error) {
      console.error('AuthContext - Simple initialization failed:', error);
      return false;
    }
  };

  const login = async (userId: string, _password: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Password validation is already done in page.tsx, just initialize user
      console.log('Initializing user Supabase connection for:', userId);
      await initializeUser(userId);
      return true;
    } catch (err) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err.message : 'Login failed');
      return false;
    }
  };

  const logout = () => {
    if (currentUserId) {
      clearUserSupabaseClient(currentUserId);
    }
    setCurrentUserId(null);
    setSupabaseClient(null);
    setError(null);
    localStorage.removeItem('currentUserId');
    console.log('User logged out');
  };

  const value: AuthContextType = {
    currentUserId,
    supabaseClient,
    isLoading,
    error,
    login,
    logout,
    isAuthenticated: !!currentUserId && !!supabaseClient,
    retryInitialization,
    simpleInitializeUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Hook to get current user's Supabase client
export function useSupabase() {
  const { supabaseClient, isAuthenticated, isLoading } = useAuth();
  
  // Return null during loading state instead of throwing error
  if (isLoading) {
    return null;
  }
  
  if (!isAuthenticated || !supabaseClient) {
    console.warn('User not authenticated or Supabase client not available');
    return null;
  }
  
  return supabaseClient;
}
