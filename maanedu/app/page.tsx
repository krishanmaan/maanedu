'use client';

import { useState, useEffect } from 'react';
import { ref, get } from 'firebase/database';
import { database } from './lib/firebase';
import { useAuth } from './contexts/AuthContext';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const { login, isAuthenticated, isLoading: authLoading, error: authError } = useAuth();
  const router = useRouter();
  
  const [step, setStep] = useState(1); // 1: Org ID, 2: Username/Password
  const [orgId, setOrgId] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      console.log('User authenticated, redirecting to admin...');
      router.push('/admin');
    }
  }, [isAuthenticated, authLoading, router]);

  const handleOrgIdSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgId.trim()) {
      setError('Please enter Organization ID');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Check if organization exists in Firebase
      const orgRef = ref(database, `user/${orgId}`);
      console.log('Checking organization at path:', `user/${orgId}`);
      
      const snapshot = await get(orgRef);
      console.log('Organization snapshot exists:', snapshot.exists());
      
      if (snapshot.exists()) {
        const orgData = snapshot.val();
        console.log('Organization data:', orgData);
        setStep(2);
      } else {
        console.log('Organization not found');
        setError('Organization ID not found');
      }
    } catch (error) {
      console.error('Error checking organization:', error);
      setError('Error connecting to database');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Please enter both username and password');
      return;
    }
    

    setLoading(true);
    setError('');

    try {
      // Get user data from Firebase
      const userRef = ref(database, `user/${orgId}`);
      console.log('Fetching from path:', `user/${orgId}`);
      
      const snapshot = await get(userRef);
      console.log('Snapshot exists:', snapshot.exists());
      
      if (snapshot.exists()) {
        const userData = snapshot.val();
        console.log('User data from Firebase:', userData);
        console.log('Expected username:', username);
        console.log('Expected password:', password);
        console.log('Firebase userID:', userData.userID);
        console.log('Firebase pass:', userData.pass);
        
        // Debug comparison
        const userIDMatch = String(userData.userID) === String(username);
        const passMatch = String(userData.pass) === String(password);
        console.log('userID match:', userIDMatch, 'Expected:', String(username), 'Got:', String(userData.userID));
        console.log('password match:', passMatch, 'Expected:', String(password), 'Got:', String(userData.pass));
        
        // Check if username and password match (convert to string for comparison)
        if (userIDMatch && passMatch) {
          console.log('Login successful! Initializing user-specific Supabase connection...');
          
          // Use the new auth system with user-specific Supabase
          const loginSuccess = await login(orgId, '123456'); // Pass fixed password for auth context
          
          if (loginSuccess) {
            console.log('User-specific Supabase connection established');
            // Redirect will happen automatically via useEffect
          } else {
            setError(authError || 'Failed to establish database connection');
          }
        } else {
          console.log('Login failed - credentials mismatch');
          setError('Invalid username or password');
        }
      } else {
        console.log('Organization not found in Firebase');
        setError('Organization not found');
      }
    } catch (error) {
      console.error('Error during login:', error);
      setError('Error during login');
    } finally {
      setLoading(false);
    }
  };

  // Show loading state while authenticating
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-r from-blue-900 to-purple-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Setting up your database connection...</p>
        </div>
      </div>
    );
  }

  const goBack = () => {
    setStep(1);
    setUsername('');
    setPassword('');
    setError('');
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Section - Black Background */}
      <div className="hidden lg:flex lg:w-1/2 bg-black items-center justify-center px-12">
        <div className="text-white max-w-md">
          <h1 className="text-5xl font-bold leading-tight mb-6">
            Ignite your
            <br />
            Digital
            <br />
            Journey
          </h1>
          <p className="text-lg text-gray-300 leading-relaxed">
            Experience the next generation of content management with intuitive design and powerful features.
          </p>
        </div>
      </div>

      {/* Right Section - White Background */}
      <div className="w-full lg:w-1/2 bg-white flex flex-col">
        {/* Logo */}
        <div className="flex justify-end p-8">
          <div className="flex items-center">
            <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center mr-2">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
              </svg>
            </div>
            <span className="text-2xl font-bold text-gray-900">MaanOX</span>
          </div>
        </div>

        {/* Login Form */}
        <div className="flex-1 flex items-center justify-center px-8">
          <div className="w-full max-w-md">
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-8">
              {step === 1 ? 'Welcome!' : 'Login to your account'}
            </h2>
            
            {/* Debug Button - Remove in production */}
            <div className="mb-4 text-center space-x-2">
             
              
              
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md">
                {error}
              </div>
            )}

            {step === 1 ? (
              // Organization ID Step
              <form className="space-y-6" onSubmit={handleOrgIdSubmit}>
                <div>
                  <label htmlFor="orgId" className="block text-sm font-medium text-gray-700 mb-2">
                    Organisation ID
                  </label>
                  <input
                    type="text"
                    id="orgId"
                    value={orgId}
                    onChange={(e) => setOrgId(e.target.value)}
                    placeholder="Enter Org. ID"
                    className="w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    disabled={loading}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-gray-800 text-white py-3 px-4 rounded-lg hover:bg-gray-900 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
                  disabled={loading}
                >
                  {loading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  ) : (
                    <>
                      <span>Proceed</span>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </>
                  )}
                </button>
              </form>
            ) : (
              // Username/Password Step
              <form className="space-y-6" onSubmit={handleLogin}>
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                    Username
                  </label>
                  <input
                    type="text"
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter Username"
                    className="w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                    disabled={loading}
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter Password"
                      className="w-full px-4 py-3 pr-12 border border-gray-300 text-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        {showPassword ? (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                        ) : (
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        )}
                      </svg>
                    </button>
                  </div>
                </div>

                
                <div className="text-xs text-gray-500 ml-7">
                  Privacy - Terms
                </div>

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={goBack}
                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    disabled={loading}
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-gray-800 text-white py-3 px-4 rounded-lg hover:bg-gray-900 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
                    disabled={loading}
                  >
                    {loading ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    ) : (
                      <>
                        <span>Login</span>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Copyright */}
        <div className="p-8 text-center">
          <p className="text-sm text-gray-600">
            Copyright © MaanOX 2025
          </p>
        </div>
      </div>
    </div>
  );
}
