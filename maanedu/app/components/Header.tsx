'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { database } from '../lib/firebase';
import { ref, get } from 'firebase/database';

interface HeaderProps {
  onLogout?: () => void;
  onToggleSidebar?: () => void;
}

export default function Header({ onLogout, onToggleSidebar }: HeaderProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [profileName, setProfileName] = useState<string>('Admin');
  const [profileEmail, setProfileEmail] = useState<string>('');
  const router = useRouter();

  useEffect(() => {
    const readProfile = async () => {
      const url = localStorage.getItem('profileImage');
      const name = localStorage.getItem('profileName');
      const email = localStorage.getItem('profileEmail');
      setAvatarUrl(url);
      if (name) setProfileName(name);
      if (email) setProfileEmail(email);

      // If nothing in localStorage, fall back to Firebase
      if ((!url || !name || !email) && typeof window !== 'undefined') {
        const uid = localStorage.getItem('currentUserId');
        if (uid) {
          try {
            const profileRef = ref(database, `user/${uid}/profile`);
            const snap = await get(profileRef);
            if (snap.exists()) {
              const data = snap.val();
              if (data?.profileImage) {
                setAvatarUrl(data.profileImage);
                localStorage.setItem('profileImage', data.profileImage);
              }
              if (data?.fullName) {
                setProfileName(data.fullName);
                localStorage.setItem('profileName', data.fullName);
              }
              if (data?.email) {
                setProfileEmail(data.email);
                localStorage.setItem('profileEmail', data.email);
              }
            }
          } catch (e) {
            // ignore
          }
        }
      }
    };
    readProfile();
    window.addEventListener('profileImageUpdated', readProfile as unknown as EventListener);
    window.addEventListener('storage', readProfile as unknown as EventListener);
    return () => {
      window.removeEventListener('profileImageUpdated', readProfile as unknown as EventListener);
      window.removeEventListener('storage', readProfile as unknown as EventListener);
    };
  }, []);

  return (
    <div className="sticky top-0 bg-white/90 backdrop-blur border-b border-gray-200 px-4 sm:px-6 py-2 z-40">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button aria-label="Open Sidebar" className="md:hidden w-10 h-10 rounded-xl border border-gray-200 hover:bg-gray-50 flex items-center justify-center" onClick={onToggleSidebar}>
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/></svg>
          </button>
          <div className="hidden md:block text-sm text-gray-500">Dashboard</div>
        </div>

        <div className="flex items-center space-x-4">
          <div className="relative w-56 sm:w-64 md:w-72 lg:w-96 hidden md:block">
            <svg className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 bg-[#F5F5F5] rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
            />
          </div>
          {/* <div className="flex items-center space-x-2">
            <button title="Notifications" className="w-10 h-10 rounded-xl border border-gray-200 hover:bg-gray-50 flex items-center justify-center">
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"/></svg>
            </button>
            <button title="Create" className="hidden sm:flex items-center gap-2 px-3 h-10 rounded-xl bg-black text-white hover:bg-gray-800">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6"/></svg>
              <span className="text-sm">New</span>
            </button>
          </div> */}

          <div className="flex items-center space-x-2 bg-[#E8E8E8] rounded-xl">
            <div className="relative">
              <div
                className="flex items-center space-x-2 cursor-pointer hover:bg-gray-100 px-3 py-2 rounded-md transition-colors"
                onClick={() => setShowDropdown(!showDropdown)}
              >
                {avatarUrl ? (
                  <img src={avatarUrl} alt="avatar" className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                )}
                <span className="text-sm  text-gray-700 font-bold">{profileName}</span>
                <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              {showDropdown && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg py-2 z-50 border border-gray-200">
                  <div className="px-4 pb-2 flex items-center gap-3">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="avatar" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    )}
                    <div>
                      <div className="font-medium text-gray-900">{profileName}</div>
                      {profileEmail && <div className="text-xs text-gray-500">{profileEmail}</div>}
                    </div>
                  </div>
                  <div className="border-t border-gray-100 my-1" />
                  <button
                    onClick={() => {
                      setShowDropdown(false);
                      router.push('/admin/profile');
                    }}
                    className=" w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Profile user
                  </button>
                  <button
                    onClick={onLogout}
                    className=" w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
