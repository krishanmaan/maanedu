'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '../../../components/Sidebar';
import Header from '../../../components/Header';
import ProductsTable from '../../../components/ProductsTable';
import LiveUpcomingTable from '../../../components/LiveUpcomingTable';
import { useAuth } from '../../../contexts/AuthContext';

export default function AdminDashboard() {
  const [activeSection, setActiveSection] = useState('live-upcoming');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      console.log('User not authenticated, redirecting to login');
      router.push('/');
    }
  }, [isLoading, isAuthenticated, router]);

  const { logout } = useAuth();
  
  const handleLogout = () => {
    logout(); // This will clear user-specific Supabase client and localStorage
    router.push('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <Sidebar
        activeSection={activeSection}
        setActiveSection={(s) => { setActiveSection(s); setSidebarOpen(false); }}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Backdrop for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="md:ml-64">
        {/* Top Header */}
        <Header onLogout={handleLogout} onToggleSidebar={() => setSidebarOpen(true)} />

        {/* Page Content */}
        <div className="p-4 sm:p-6 mx-auto">
          {activeSection === 'products' && <ProductsTable />}
          
          {activeSection === 'live-upcoming' && <LiveUpcomingTable />}
          {activeSection === 'forum' && (
            <div className="text-center py-12">
              <h2 className="text-2xl font-bold text-gray-900">Forum</h2>
              <p className="text-gray-600 mt-2">Coming soon...</p>
            </div>
          )}
          {activeSection === 'content' && (
            <div className="text-center py-12">
              <h2 className="text-2xl font-bold text-gray-900">Content</h2>
              <p className="text-gray-600 mt-2">Coming soon...</p>
            </div>
          )}
          {activeSection === 'analytics' && (
            <div className="text-center py-12">
              <h2 className="text-2xl font-bold text-gray-900">Analytics</h2>
              <p className="text-gray-600 mt-2">Coming soon...</p>
            </div>
          )}
          {activeSection === 'settings' && (
            <div className="text-center py-12">
              <h2 className="text-2xl font-bold text-gray-900">Settings</h2>
              <p className="text-gray-600 mt-2">Coming soon...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
