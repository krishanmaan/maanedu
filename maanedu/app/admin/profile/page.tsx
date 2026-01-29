'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { database } from '../../lib/firebase';
import { ref, set, get } from 'firebase/database';

interface ProfileData {
  fullName: string;
  email: string;
  mobile: string;
  address: string;
  username: string;
  profileImage: string | null;
}

interface FinancialData {
  name: string;
  email: string;
  mobile: string;
  state: string;
  gstin: string;
  sacNo: string;
  showHsnInvoice: boolean;
}

interface SocialLinks {
  facebook: string;
  twitter: string;
  linkedin: string;
  instagram: string;
  youtube: string;
  website: string;
}

export default function AdminProfile() {
  const { currentUserId, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'profile' | 'financial' | 'social'>('profile');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [profileImagePreview, setProfileImagePreview] = useState<string | null>(null);

  // Profile data state
  const [profileData, setProfileData] = useState<ProfileData>({
    fullName: 'Maa Sharde',
    email: 'maashardepaota@gmail.com',
    mobile: '8239404141',
    address: 'Munga Ji Complex, Paota',
    username: 'admin',
    profileImage: null
  });

  // Financial data state
  const [financialData, setFinancialData] = useState<FinancialData>({
    name: 'Maa Sharde Paota',
    email: 'maashardepaota@gmail.com',
    mobile: '8239404141',
    state: 'Rajasthan',
    gstin: '',
    sacNo: '',
    showHsnInvoice: false
  });

  // Social links state
  const [socialLinks, setSocialLinks] = useState<SocialLinks>({
    facebook: '',
    twitter: '',
    linkedin: '',
    instagram: '',
    youtube: '',
    website: ''
  });

  // Load profile data from Firebase
  const loadProfileData = useCallback(async () => {
    const uid = currentUserId || (typeof window !== 'undefined' ? localStorage.getItem('currentUserId') : null);
    if (!uid) {
      console.warn('No user id available to load profile');
      return;
    }
    
    try {
      const profileRef = ref(database, `user/${uid}`);
      const snapshot = await get(profileRef);
      
      if (snapshot.exists()) {
        const data = snapshot.val();
        
        // Load profile data
        if (data.profile) {
          setProfileData(prev => ({
            ...prev,
            ...data.profile
          }));
          if (data.profile.profileImage) {
            setProfileImagePreview(data.profile.profileImage);
          }
        }
        
        // Load financial data
        if (data.financial) {
          setFinancialData(prev => ({
            ...prev,
            ...data.financial
          }));
        }
        
        // Load social links
        if (data.social) {
          setSocialLinks(prev => ({
            ...prev,
            ...data.social
          }));
        }
        
        console.log('Profile data loaded from Firebase:', data);
      } else {
        console.log('No existing profile data found');
      }
    } catch (error) {
      console.error('Error loading profile data:', error);
      setMessage({ type: 'error', text: 'Failed to load profile data' });
    }
  }, [currentUserId]);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/');
    } else if (isAuthenticated && currentUserId) {
      loadProfileData();
    }
  }, [isAuthenticated, isLoading, router, currentUserId, loadProfileData]);

  const handleProfileImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setMessage({ type: 'error', text: 'Image size should be less than 5MB' });
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setProfileImagePreview(result);
        setProfileData(prev => ({ ...prev, profileImage: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (!currentUserId) {
        throw new Error('User ID not available');
      }

      // Save to Firebase Realtime Database
      const profileRef = ref(database, `user/${currentUserId}/profile`);
      await set(profileRef, {
        ...profileData,
        updatedAt: new Date().toISOString()
      });

      // Persist profile info for header and broadcast update
      if (profileData.profileImage) {
        localStorage.setItem('profileImage', profileData.profileImage);
      }
      if (profileData.email) {
        localStorage.setItem('profileEmail', profileData.email);
      }
      if (profileData.fullName) {
        localStorage.setItem('profileName', profileData.fullName);
      }
      window.dispatchEvent(new Event('profileImageUpdated'));

      setMessage({ type: 'success', text: 'Profile updated successfully!' });
      console.log('Profile data saved to Firebase:', profileData);
    } catch (error) {
      console.error('Error saving profile:', error);
      setMessage({ type: 'error', text: 'Failed to update profile' });
    } finally {
      setLoading(false);
    }
  };

  const handleFinancialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (!currentUserId) {
        throw new Error('User ID not available');
      }

      // Save to Firebase Realtime Database
      const financialRef = ref(database, `user/${currentUserId}/financial`);
      await set(financialRef, {
        ...financialData,
        updatedAt: new Date().toISOString()
      });

      setMessage({ type: 'success', text: 'Financial details updated successfully!' });
      console.log('Financial data saved to Firebase:', financialData);
    } catch (error) {
      console.error('Error saving financial details:', error);
      setMessage({ type: 'error', text: 'Failed to update financial details' });
    } finally {
      setLoading(false);
    }
  };

  const handleSocialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (!currentUserId) {
        throw new Error('User ID not available');
      }

      // Save to Firebase Realtime Database
      const socialRef = ref(database, `user/${currentUserId}/social`);
      await set(socialRef, {
        ...socialLinks,
        updatedAt: new Date().toISOString()
      });

      setMessage({ type: 'success', text: 'Social links updated successfully!' });
      console.log('Social links saved to Firebase:', socialLinks);
    } catch (error) {
      console.error('Error saving social links:', error);
      setMessage({ type: 'error', text: 'Failed to update social links' });
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm mb-6 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/admin')}
                className="text-gray-600 hover:text-gray-800"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h1 className="text-2xl font-bold text-gray-900">Admin Profile</h1>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">A</span>
              </div>
              <span className="text-sm text-gray-600">{currentUserId}</span>
            </div>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 
            'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message.text}
          </div>
        )}

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-sm">
          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('profile')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'profile'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Profile
              </button>
              <button
                onClick={() => setActiveTab('financial')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'financial'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Financial Details
              </button>
              <button
                onClick={() => setActiveTab('social')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'social'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Social Links
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <form onSubmit={handleProfileSubmit} className="space-y-6">
                {/* Profile Image */}
                <div className="flex flex-col items-center space-y-4">
                  <div className="relative">
                    {profileImagePreview || profileData.profileImage ? (
                      <Image
                        src={profileImagePreview || profileData.profileImage || ''}
                        alt="Profile"
                        width={120}
                        height={120}
                        className="w-30 h-30 rounded-full object-cover border-4 border-orange-500"
                      />
                    ) : (
                      <div className="w-30 h-30 rounded-full bg-orange-500 flex items-center justify-center border-4 border-orange-500">
                        <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                        </svg>
                      </div>
                    )}
                  </div>
                  <div>
                    <label
                      htmlFor="profile-image"
                      className="cursor-pointer bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      Upload
                    </label>
                    <input
                      id="profile-image"
                      type="file"
                      accept="image/*"
                      onChange={handleProfileImageUpload}
                      className="hidden"
                    />
                  </div>
                </div>

                {/* Primary Details */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Primary Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Full Name
                      </label>
                      <input
                        type="text"
                        value={profileData.fullName}
                        onChange={(e) => setProfileData(prev => ({ ...prev, fullName: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={profileData.email}
                        onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Contact Information */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Information</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Mobile
                      </label>
                      <input
                        type="tel"
                        value={profileData.mobile}
                        onChange={(e) => setProfileData(prev => ({ ...prev, mobile: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Address
                      </label>
                      <textarea
                        value={profileData.address}
                        onChange={(e) => setProfileData(prev => ({ ...prev, address: e.target.value }))}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Panel Credentials */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Panel Credentials</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        User Name
                      </label>
                      <input
                        type="text"
                        value={profileData.username}
                        onChange={(e) => setProfileData(prev => ({ ...prev, username: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Password
                      </label>
                      <div className="relative">
                        <input
                          type="password"
                          value="••••••••••••••••••••••••••••••••••••••••••••••••"
                          readOnly
                          className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-2 text-sm text-blue-600 hover:text-blue-800"
                        >
                          Reset Password
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end space-x-4">
                  <button
                    type="button"
                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                  >
                    Reset
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 bg-black text-white rounded-md hover:bg-gray-800 disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}

            {/* Financial Details Tab */}
            {activeTab === 'financial' && (
              <form onSubmit={handleFinancialSubmit} className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Invoice Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={financialData.name}
                        onChange={(e) => setFinancialData(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Email <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        value={financialData.email}
                        onChange={(e) => setFinancialData(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Mobile No.
                      </label>
                      <input
                        type="tel"
                        value={financialData.mobile}
                        onChange={(e) => setFinancialData(prev => ({ ...prev, mobile: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        State <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={financialData.state}
                        onChange={(e) => setFinancialData(prev => ({ ...prev, state: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        GSTIN
                      </label>
                      <input
                        type="text"
                        placeholder="Leave empty if taxes not applicable"
                        value={financialData.gstin}
                        onChange={(e) => setFinancialData(prev => ({ ...prev, gstin: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        SAC No
                      </label>
                      <input
                        type="text"
                        placeholder="Leave empty if taxes not applicable"
                        value={financialData.sacNo}
                        onChange={(e) => setFinancialData(prev => ({ ...prev, sacNo: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="mt-6">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="showHsnInvoice"
                        checked={financialData.showHsnInvoice}
                        onChange={(e) => setFinancialData(prev => ({ ...prev, showHsnInvoice: e.target.checked }))}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="showHsnInvoice" className="ml-2 text-sm text-gray-700">
                        Show HSN No. On Invoice
                      </label>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Switch on if you want to show HSN no Invoice.
                    </p>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}

            {/* Social Links Tab */}
            {activeTab === 'social' && (
              <form onSubmit={handleSocialSubmit} className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Social Media Links</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Facebook URL
                      </label>
                      <input
                        type="url"
                        placeholder="https://facebook.com/yourpage"
                        value={socialLinks.facebook}
                        onChange={(e) => setSocialLinks(prev => ({ ...prev, facebook: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Twitter URL
                      </label>
                      <input
                        type="url"
                        placeholder="https://twitter.com/yourusername"
                        value={socialLinks.twitter}
                        onChange={(e) => setSocialLinks(prev => ({ ...prev, twitter: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        LinkedIn URL
                      </label>
                      <input
                        type="url"
                        placeholder="https://linkedin.com/in/yourprofile"
                        value={socialLinks.linkedin}
                        onChange={(e) => setSocialLinks(prev => ({ ...prev, linkedin: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Instagram URL
                      </label>
                      <input
                        type="url"
                        placeholder="https://instagram.com/yourusername"
                        value={socialLinks.instagram}
                        onChange={(e) => setSocialLinks(prev => ({ ...prev, instagram: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        YouTube URL
                      </label>
                      <input
                        type="url"
                        placeholder="https://youtube.com/c/yourchannel"
                        value={socialLinks.youtube}
                        onChange={(e) => setSocialLinks(prev => ({ ...prev, youtube: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Website URL
                      </label>
                      <input
                        type="url"
                        placeholder="https://yourwebsite.com"
                        value={socialLinks.website}
                        onChange={(e) => setSocialLinks(prev => ({ ...prev, website: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
