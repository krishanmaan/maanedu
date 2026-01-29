'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface SidebarProps {
  activeSection: string;
  setActiveSection: (section: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ activeSection, setActiveSection, isOpen = false, onClose }: SidebarProps) {
  const router = useRouter();
  const [isProductsOpen, setIsProductsOpen] = useState(
    ['products', 'live-upcoming', 'forum', 'content'].includes(activeSection)
  );
  
  const menuItems = [
    { id: 'products', label: 'Products', icon: 'folder', active: true, route: '/admin/products' },
    { id: 'banners', label: 'Banners', icon: 'banner', route: '/admin/banner' },
    { id: 'links', label: 'Links', icon: 'link', route: '/admin/link' },
    { id: 'analytics', label: 'Analytics', icon: 'graph', route: '/admin/analytics' },
    { id: 'settings', label: 'Settings', icon: 'gear', route: null }
  ];

  const productSubItems = [
    { id: 'live-upcoming', label: 'Live & Upcoming', icon: 'live', route: '/admin/products/Live-Upcoming' },
    { id: 'forum', label: 'Forum', icon: 'forum', route: null },
    { id: 'content', label: 'Content', icon: 'content', route: null }
  ];

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'folder':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
          </svg>
        );
      case 'banner':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      case 'live':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        );
      case 'forum':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        );
      case 'content':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'graph':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        );
      case 'link':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 010 5.656l-2 2a4 4 0 11-5.656-5.656l1-1" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.172 13.828a4 4 0 010-5.656l2-2a4 4 0 115.656 5.656l-1 1" />
          </svg>
        );
      case 'gear':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className={`fixed inset-y-0 left-0 w-64 bg-white/90 backdrop-blur-md border-r border-gray-100 z-50 transform transition-transform md:translate-x-0 ${
      isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
    } shadow-lg md:rounded-r-2xl`}
      aria-label="Sidebar navigation"
    >
      {/* Logo */}
      <div className="flex items-center justify-between h-16 px-4 bg-gradient-to-r from-orange-500 to-orange-600 md:rounded-tr-2xl">
        <div className="flex items-center text-white">
          <div className="w-8 h-8 bg-white/95 rounded mr-2 flex items-center justify-center shadow-sm ring-1 ring-white/60">
            <svg className="w-5 h-5 text-orange-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </div>
          <span className="text-xl font-bold tracking-wide drop-shadow-sm">MaanEdu</span>
        </div>
        <button
          aria-label="Close Sidebar"
          className="md:hidden text-white/90 hover:text-white"
          onClick={onClose}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>

      {/* Navigation */}
      <nav className="mt-3 px-3">
        <div className="text-[11px] uppercase tracking-wider font-semibold text-gray-400/90 px-2 py-2">Menu</div>
        <div className="space-y-1">
          {/* Products (with dropdown) */}
          <div>
            <button
              key="products"
              onClick={() => {
                // Toggle dropdown open state; do not navigate on toggle click
                setIsProductsOpen((prev) => !prev);
                setActiveSection('products');
              }}
              title="Products"
              className={`group relative w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-orange-200 ${
                ['products', 'live-upcoming', 'forum', 'content'].includes(activeSection)
                  ? 'bg-orange-50 text-gray-900 shadow-sm ring-1 ring-orange-100'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <span className="flex items-center">
                <span className="mr-3">{getIcon('folder')}</span>
                <span className="truncate font-medium">Products</span>
              </span>
              <svg
                className={`w-4 h-4 text-gray-400 group-hover:text-gray-500 transition-transform ${isProductsOpen ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isProductsOpen && (
              <div className="mt-1 space-y-1 pl-5">
                {/* Products main link */}
                <button
                  key="products-main"
                  onClick={() => {
                    router.push('/admin/products');
                    if (onClose) onClose();
                  }}
                  title="All Products"
                  className={`relative w-full flex items-center px-3 py-2 text-sm rounded-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-orange-200 ${
                    activeSection === 'products' ? 'bg-gray-100 text-gray-900 shadow-sm' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  {activeSection === 'products' && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r bg-orange-500" />
                  )}
                  <span className="mr-3">{getIcon('folder')}</span>
                  <span className="truncate">All Products</span>
                </button>

                {productSubItems.map((sub) => (
                  <button
                    key={sub.id}
                    onClick={() => {
                      if (sub.route) {
                        router.push(sub.route);
                        if (onClose) onClose();
                      } else {
                        setActiveSection(sub.id);
                      }
                    }}
                    title={sub.label}
                    className={`relative w-full flex items-center px-3 py-2 text-sm rounded-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-orange-200 ${
                      activeSection === sub.id ? 'bg-gray-100 text-gray-900 shadow-sm' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    {activeSection === sub.id && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r bg-orange-500" />
                    )}
                    <span className="mr-3">{getIcon(sub.icon)}</span>
                    <span className="truncate">{sub.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Remaining top-level items */}
          {menuItems
            .filter((item) => item.id !== 'products')
            .map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  if (item.route) {
                    router.push(item.route);
                    if (onClose) onClose();
                  } else {
                    setActiveSection(item.id);
                  }
                }}
                title={item.label}
                className={`relative w-full flex items-center px-3 py-2 text-sm rounded-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-orange-200 ${
                  activeSection === item.id
                    ? 'bg-gray-100 text-gray-900 shadow-sm'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                {activeSection === item.id && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r bg-orange-500" />
                )}
                <span className="mr-3">{getIcon(item.icon)}</span>
                <span className="truncate">{item.label}</span>
              </button>
            ))}
        </div>
        <div className="mt-4 border-t border-gray-100"/>
        <div className="px-3 py-3">
          <div className="w-full rounded-lg bg-gray-50 text-[11px] text-gray-500 px-3 py-2 flex items-center justify-between ring-1 ring-gray-100">
            <span>v1.0 • Admin</span>
            <span className="inline-flex items-center gap-1 text-gray-400">
              <span className="h-2 w-2 rounded-full bg-green-400" />
              Online
            </span>
          </div>
        </div>
      </nav>
    </div>
  );
}
