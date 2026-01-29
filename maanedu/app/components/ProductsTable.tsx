'use client';

import { useState, useEffect } from 'react';
import { useSupabase } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

// Types
interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  created_at: string;
}

export default function ProductsTable() {
  // Get user-specific Supabase client
  const supabase = useSupabase();
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [openActionsId, setOpenActionsId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [enabledById, setEnabledById] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadCourses();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('#global-actions-menu') || target.closest('[data-actions-button]')) return;
      setOpenActionsId(null);
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenActionsId(null);
    };
    window.addEventListener('click', handleClickOutside);
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('click', handleClickOutside);
      window.removeEventListener('keydown', handleEsc);
    };
  }, []);

  const loadCourses = async () => {
    if (!supabase) {
      console.error('Supabase client not available');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      const list = (data || []) as (Course & { enabled?: boolean })[];
      setCourses(list);
      const initialEnabled: Record<string, boolean> = {};
      list.forEach((c) => {
        // prefer course.enabled if it exists; else default to true
        initialEnabled[c.id] = typeof c.enabled === 'boolean' ? c.enabled : true;
      });
      setEnabledById(initialEnabled);
    } catch (error) {
      console.error('Error loading courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleEnabled = async (courseId: string) => {
    if (!supabase) return;
    
    setEnabledById((prev) => ({ ...prev, [courseId]: !prev[courseId] }));
    try {
      // Try to persist if an `enabled` column exists; ignore errors silently
      // so UI doesn't break if the column isn't there.
      await supabase.from('courses').update({ enabled: enabledById[courseId] ? false : true }).eq('id', courseId);
    } catch (e) {
      // no-op
    }
  };

  const deleteCourse = async (courseId: string) => {
    if (!supabase) return;
    if (!confirm('Delete this course? This cannot be undone.')) return;
    try {
      const { error } = await supabase.from('courses').delete().eq('id', courseId);
      if (error) throw error;
      await loadCourses();
    } catch (e) {
      console.error('Delete failed', e);
    }
  };

  const filteredCourses = courses.filter(course =>
    course.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (course.category && course.category.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const totalPages = Math.ceil(filteredCourses.length / entriesPerPage);
  const startIndex = (currentPage - 1) * entriesPerPage;
  const endIndex = startIndex + entriesPerPage;
  const currentCourses = filteredCourses.slice(startIndex, endIndex);

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button className="py-2 px-1 border-b-2 font-medium text-sm border-black text-black">Products</button>
          <button
            onClick={() => router.push('/admin/products/Live-Upcoming')}
            className="py-2 px-1 border-b-2 font-medium text-sm border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          >
            Live & Upcoming
          </button>
          <button className="py-2 px-1 border-b-2 font-medium text-sm border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300">
            Forum
          </button>
          <button className="py-2 px-1 border-b-2 font-medium text-sm border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300">
            Content
          </button>
        </nav>
      </div>

      {/* Products Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Products</h1>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full">
            <div className="relative w-full sm:w-auto">
              <svg className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search"
                className="w-full sm:w-80 pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3">
              <button aria-label="Filters" title="Filters" className="w-10 h-10 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors flex items-center justify-center text-gray-700">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.207A1 1 0 013 6.5V4z" />
                </svg>
              </button>
              <button aria-label="Add Course" title="Add Course" onClick={() => window.location.href = '/admin/add-course'} className="w-10 h-10 bg-black text-white rounded-full hover:bg-gray-800 transition-colors flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </button>
              <button aria-label="More" title="More" className="w-10 h-10 bg-gray-900 text-white rounded-full hover:bg-gray-800 transition-colors flex items-center justify-center">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Products Table (desktop/tablet) */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-visible hidden md:block">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className=" pl-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
                  S. NO.
                  <svg className="w-4 h-4 inline ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                  </svg>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  PRODUCT NAME
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  CATEGORY
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  PRICE
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SORT BY
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  ACTIONS
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading products...</p>
                  </td>
                </tr>
              ) : currentCourses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-600">
                    {searchTerm ? 'No products found matching your search.' : 'No products found. Add your first product!'}
                  </td>
                </tr>
              ) : (
                currentCourses.map((course, index) => (
                  <tr
                    key={course.id}
                    className="odd:bg-white even:bg-gray-50/50 hover:bg-gray-50 cursor-pointer"
                    onClick={(e) => {
                      const target = e.target as HTMLElement;
                      if (target.closest('button')) return;
                      window.location.href = `/admin/courses/${course.id}/classes`;
                    }}
                    title="Open Add/View Content"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{startIndex + index + 1}</td>
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{course.title}</div>
                        {/* <div className="text-sm text-gray-500">{course.description}</div> */}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {course.category || 'Uncategorized'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                      ₹{course.price || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">0.00</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="relative inline-block text-left">
                        <button
                          data-actions-button
                          onClick={(e) => {
                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                            const left = Math.max(8, rect.right - 224);
                            const top = rect.bottom + 6;
                            setMenuPosition({ top, left });
                            setOpenActionsId(openActionsId === course.id ? null : course.id);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                        >
                          Actions
                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        {openActionsId === course.id && (
                          <div className="hidden"></div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Products Cards (mobile) */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading products...</p>
          </div>
        ) : currentCourses.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center text-gray-600">
            {searchTerm ? 'No products found matching your search.' : 'No products found. Add your first product!'}
          </div>
        ) : (
          currentCourses.map((course) => (
            <div
              key={course.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
              onClick={(e) => {
                const target = e.target as HTMLElement;
                if (target.closest('button') || target.closest('input')) return;
                window.location.href = `/admin/courses/${course.id}/classes`;
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-base font-semibold text-gray-900">{course.title}</div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="inline-flex px-2 py-0.5 text-[11px] font-semibold rounded-full bg-blue-100 text-blue-800">
                      {course.category || 'Uncategorized'}
                    </span>
                    <span className="text-sm font-medium text-green-600">₹{course.price || 0}</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => (window.location.href = `/admin/courses/${course.id}`)}
                    className="px-3 py-1.5 text-xs rounded-md border border-gray-300 text-gray-700"
                  >
                    Overview
                  </button>
                  <button
                    onClick={() => (window.location.href = `/admin/courses/${course.id}/classes`)}
                    className="px-3 py-1.5 text-xs rounded-md bg-black text-white"
                  >
                    Content
                  </button>
                </div>
                <div className="flex items-center gap-3">
                  <label className="text-xs text-gray-600">Enabled</label>
                  <button
                    onClick={() => toggleEnabled(course.id)}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${enabledById[course.id] ? 'bg-black' : 'bg-gray-300'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabledById[course.id] ? 'translate-x-4' : 'translate-x-1'}`}></span>
                  </button>
                  <button
                    onClick={() => deleteCourse(course.id)}
                    className="px-2 py-1.5 text-xs rounded-md border border-red-200 text-red-600"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      <div className="bg-white p-4 sm:p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-sm text-gray-700">
            Showing {filteredCourses.length === 0 ? 0 : startIndex + 1} to {Math.min(endIndex, filteredCourses.length)} of {filteredCourses.length} entries
          </div>
          <div className="flex items-center gap-4">
            <select
              className="px-3 py-1 border border-gray-300 rounded-md text-sm text-gray-700"
              value={entriesPerPage}
              onChange={(e) => {
                setEntriesPerPage(parseInt(e.target.value));
                setCurrentPage(1);
              }}
            >
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
            <div className="flex gap-2">
              <button
                className="px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  className={`px-3 py-1 border rounded-md text-sm ${currentPage === page
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 hover:bg-gray-50 text-gray-700'
                    }`}
                  onClick={() => setCurrentPage(page)}
                >
                  {page}
                </button>
              ))}
              <button
                className="px-3 py-1 border border-gray-300 rounded-md text-sm hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Global fixed Actions menu */}
      {openActionsId && (
        <div
          id="global-actions-menu"
          style={{ position: 'fixed', top: menuPosition.top, left: menuPosition.left }}
          className="w-56 rounded-lg shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-[999] overflow-hidden"
        >
          <div className="py-1">
            <button
              onClick={() => {
                window.location.href = `/admin/courses/${openActionsId}`;
                setOpenActionsId(null);
              }}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <span className="text-blue-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 11c0 1.657-1.567 3-3.5 3S5 12.657 5 11s1.567-3 3.5-3S12 9.343 12 11zM19 11c0 1.657-1.567 3-3.5 3S12 12.657 12 11s1.567-3 3.5-3S19 9.343 19 11z" /></svg>
              </span>
              Course Overview
            </button>
            <button
              onClick={() => {
                window.location.href = `/admin/courses/${openActionsId}/classes`;
                setOpenActionsId(null);
              }}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <span className="text-blue-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
              </span>
              Add/View Content
            </button>
            <div className="w-full flex items-center justify-between px-4 py-2 text-sm text-gray-700">
              <div className="flex items-center gap-3">
                <span className="text-blue-500">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20 10 10 0 000-20z" /></svg>
                </span>
                Enabled
              </div>
              <button onClick={() => { toggleEnabled(openActionsId); }} className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${enabledById[openActionsId] ? 'bg-black' : 'bg-gray-300'}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabledById[openActionsId] ? 'translate-x-4' : 'translate-x-1'}`}></span>
              </button>
            </div>
            <button
              onClick={() => { window.location.href = `/admin/add-course?edit=${openActionsId}`; setOpenActionsId(null); }}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <span className="text-gray-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5l7 7-6 6H5v-7l6-6z" /></svg>
              </span>
              Edit
            </button>
            <button
              onClick={() => { console.log('Duplicate', openActionsId); setOpenActionsId(null); }}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <span className="text-gray-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2M8 12h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4a2 2 0 012-2z" /></svg>
              </span>
              Duplicate
            </button>
            <button
              onClick={() => { loadCourses(); setOpenActionsId(null); }}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              <span className="text-blue-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v6h6M20 20v-6h-6M20 4l-6 6M4 20l6-6" /></svg>
              </span>
              Refresh
            </button>
          </div>
          <div className="border-t border-gray-100" />
          <div className="py-1">
            <button
              onClick={() => { deleteCourse(openActionsId); setOpenActionsId(null); }}
              className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              <span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3m-9 0h10" /></svg>
              </span>
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
