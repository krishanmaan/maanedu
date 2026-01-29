'use client';

import { useState, useEffect } from 'react';
import { useSupabase } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';

// Types
interface CourseLite {
  title: string;
  category: string;
  price: number;
}

interface CourseRef extends CourseLite {
  id: string;
}

interface LiveRow {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  starts_at: string | null;
  created_at: string;
  courses?: CourseLite | null;
}

export default function ProductsTable() {
  // Get user-specific Supabase client
  const supabase = useSupabase();
  const router = useRouter();
  const [courses, setCourses] = useState<LiveRow[]>([]);
  const [allCourses, setAllCourses] = useState<CourseRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [openActionsId, setOpenActionsId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [enabledById, setEnabledById] = useState<Record<string, boolean>>({});
  // Drawer state for Add Live Stream
  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
  const [isGoLiveOpen, setIsGoLiveOpen] = useState<null | { id: string; rtmp: string; key: string; share: string }>(null);
  const [addTab, setAddTab] = useState<'basic' | 'advanced'>('basic');
  const [liveTitle, setLiveTitle] = useState('');
  const [liveDescription, setLiveDescription] = useState('');
  const [publishOn, setPublishOn] = useState('');
  const [liveImagePreview, setLiveImagePreview] = useState<string | null>(null);
  const [liveImageUrl, setLiveImageUrl] = useState<string>('');
  const [courseSearch, setCourseSearch] = useState('');
  const [isCourseDropdownOpen, setIsCourseDropdownOpen] = useState(false);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSaveLive = async () => {
    if (!supabase) return;
    setSaveError(null);
    if (!selectedCourseId) { setSaveError('Please select a course.'); return; }
    if (!liveTitle.trim()) { setSaveError('Please enter a title.'); return; }
    try {
      setIsSaving(true);
      const { error } = await supabase
        .from('Liveclass')
        .insert({
          course_id: selectedCourseId,
          title: liveTitle.trim(),
          description: liveDescription.trim() || null,
          starts_at: publishOn ? new Date(publishOn).toISOString() : null,
          image_url: liveImageUrl || null,
        });
      if (error) throw error;
      setIsSaving(false);
      setIsAddDrawerOpen(false);
      // reset minimal fields
      setSelectedCourseId(null);
      setCourseSearch('');
      setLiveTitle('');
      setLiveDescription('');
      setPublishOn('');
      setLiveImagePreview(null);
      setLiveImageUrl('');
      await loadCourses();
    } catch (e: unknown) {
      setIsSaving(false);
      const message = e instanceof Error ? e.message : 'Failed to save live stream';
      setSaveError(message);
    }
  };

  useEffect(() => {
    loadCourses();
    loadAllCourses();
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
        .from('Liveclass')
        .select('id, course_id, title, description, starts_at, created_at, courses:course_id ( title, category, price )')
        .order('created_at', { ascending: false });

      if (error) throw error;
      type RawRow = LiveRow & { enabled?: boolean } & { courses?: CourseLite | CourseLite[] | null };
      const list: RawRow[] = (data || []) as RawRow[];
      const normalized: (LiveRow & { enabled?: boolean })[] = list.map((row) => ({
        ...row,
        courses: Array.isArray(row.courses) ? row.courses[0] : row.courses ?? null,
      }));
      setCourses(normalized);
      const initialEnabled: Record<string, boolean> = {};
      normalized.forEach((c) => {
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

  const loadAllCourses = async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('id, title, category, price')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setAllCourses((data || []) as unknown as CourseRef[]);
    } catch (_e) {
      // ignore
    }
  };

  const toggleEnabled = async (courseId: string) => {
    if (!supabase) return;
    
    setEnabledById((prev) => ({ ...prev, [courseId]: !prev[courseId] }));
    try {
      // Try to persist if an `enabled` column exists; ignore errors silently
      // so UI doesn't break if the column isn't there.
      await supabase.from('Liveclass').update({ enabled: enabledById[courseId] ? false : true }).eq('id', courseId);
    } catch (_e) {
      // no-op
    }
  };

  const deleteCourse = async (courseId: string) => {
    if (!supabase) return;
    if (!confirm('Delete this course? This cannot be undone.')) return;
    try {
      const { error } = await supabase.from('Liveclass').delete().eq('id', courseId);
      if (error) throw error;
      await loadCourses();
    } catch (e) {
      console.error('Delete failed', e);
    }
  };

  const openGoLive = async (row: LiveRow) => {
    try {
      const res = await fetch('/api/mux', { method: 'POST' });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || 'Failed to init live');
      const live = json.live as { rtmp_url: string; stream_key: string; playback_id?: string; id: string };
      const share = live.playback_id ? `https://stream.mux.com/${live.playback_id}.m3u8` : '';
      setIsGoLiveOpen({ id: live.id, rtmp: live.rtmp_url, key: live.stream_key, share });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to start live';
      alert(message);
    }
  };

  const filteredCourses = courses.filter(course =>
    (course.courses?.title || course.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (course.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    ((course.courses?.category || '').toLowerCase().includes(searchTerm.toLowerCase()))
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
          <button
            onClick={() => router.push('/admin/products')}
            className="py-2 px-1 border-b-2 font-medium text-sm border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
          >
            Products
          </button>
          <button className="py-2 px-1 border-b-2 font-medium text-sm border-black text-black">
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

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Live & Upcoming</h1>
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
              <button aria-label="Add Live" title="Add Live" onClick={() => setIsAddDrawerOpen(true)} className="w-10 h-10 bg-black text-white rounded-full hover:bg-gray-800 transition-colors flex items-center justify-center">
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
                <th className=" pl-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">S. NO.</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PRODUCT</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">TITLE</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">LIVE ON</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">GO LIVE</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Loading live streams...</p>
                  </td>
                </tr>
              ) : currentCourses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-600">
                    {searchTerm ? 'No live streams found matching your search.' : 'No live streams found. Add your first live!'}
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
                      window.location.href = `/admin/courses/${course.course_id}/classes`;
                    }}
                    title="Open Add/View Content"
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{startIndex + index + 1}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{course.courses?.title || 'Untitled course'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{course.title}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {course.starts_at ? new Date(course.starts_at).toLocaleString(undefined, { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button onClick={() => openGoLive(course)} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-green-100 text-green-700">
                        Go Live
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                      </button>
                    </td>
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
            <p className="mt-2 text-gray-600">Loading live streams...</p>
          </div>
        ) : currentCourses.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 text-center text-gray-600">
            {searchTerm ? 'No live streams found matching your search.' : 'No live streams found. Add your first live!'}
          </div>
        ) : (
          currentCourses.map((course) => (
            <div
              key={course.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 p-4"
              onClick={(e) => {
                const target = e.target as HTMLElement;
                if (target.closest('button') || target.closest('input')) return;
                window.location.href = `/admin/courses/${course.course_id}/classes`;
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-base font-semibold text-gray-900">{course.title}</div>
                  <div className="text-xs text-gray-500">{course.courses?.title || 'Untitled course'}</div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="inline-flex px-2 py-0.5 text-[11px] font-semibold rounded-full bg-blue-100 text-blue-800">
                      {course.courses?.category || 'Uncategorized'}
                    </span>
                    <span className="text-sm font-medium text-green-600">₹{course.courses?.price || 0}</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => (window.location.href = `/admin/courses/${course.course_id}`)}
                    className="px-3 py-1.5 text-xs rounded-md border border-gray-300 text-gray-700"
                  >
                    Overview
                  </button>
                  <button
                    onClick={() => (window.location.href = `/admin/courses/${course.course_id}/classes`)}
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

      {/* Add Live Stream Side Drawer */}
      {isAddDrawerOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-[998]"
            onClick={() => setIsAddDrawerOpen(false)}
          />
          <div className="fixed inset-y-0 right-0 w-full sm:w-[520px] bg-white shadow-xl z-[999] flex flex-col">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">Add Live Stream</h2>
              <button
                aria-label="Close"
                className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center"
                onClick={() => setIsAddDrawerOpen(false)}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="px-6 pt-4 border-b">
              <div className="flex gap-6">
                <button onClick={() => setAddTab('basic')} className={`pb-3 text-sm font-medium border-b-2 ${addTab==='basic'?'border-black text-black':'border-transparent text-gray-500 hover:text-gray-700'}`}>Basic</button>
                <button onClick={() => setAddTab('advanced')} className={`pb-3 text-sm font-medium border-b-2 ${addTab==='advanced'?'border-black text-black':'border-transparent text-gray-500 hover:text-gray-700'}`}>Advanced</button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
              {addTab === 'basic' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Courses <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search"
                        className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
                        value={selectedCourseId ? (allCourses.find(c=>c.id===selectedCourseId)?.title || '') : courseSearch}
                        onChange={(e)=>{ setSelectedCourseId(null); setCourseSearch(e.target.value); setIsCourseDropdownOpen(true); }}
                        onFocus={()=>setIsCourseDropdownOpen(true)}
                        onBlur={()=> setTimeout(()=> setIsCourseDropdownOpen(false), 150)}
                      />
                      <svg className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>

                      {isCourseDropdownOpen && (
                        <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-md shadow-lg max-h-56 overflow-auto">
                          {allCourses
                            .filter(c => (courseSearch ? c.title.toLowerCase().includes(courseSearch.toLowerCase()) : true))
                            .map(c => (
                              <button
                                key={c.id}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                                onMouseDown={(e)=>e.preventDefault()}
                                onClick={()=>{ setSelectedCourseId(c.id); setIsCourseDropdownOpen(false); }}
                              >
                                <div className="font-medium text-gray-900">{c.title}</div>
                                <div className="text-xs text-gray-500">{c.category || 'Uncategorized'}</div>
                              </button>
                            ))}
                          {allCourses.length === 0 && (
                            <div className="px-3 py-2 text-sm text-gray-500">No courses found</div>
                          )}
                        </div>
                      )}
                      {selectedCourseId && (
                        <div className="mt-2 inline-flex items-center gap-2 px-2 py-1 text-xs rounded-full bg-blue-50 text-blue-700">
                          <span>{allCourses.find(c=>c.id===selectedCourseId)?.title}</span>
                          <button
                            className="text-blue-600 hover:text-blue-800"
                            onClick={()=>{ setSelectedCourseId(null); setCourseSearch(''); }}
                          >
                            ×
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  {saveError && (
                    <div className="text-sm text-red-600">{saveError}</div>
                  )}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-800">Live Stream Details</h3>
                    <div className="mt-3 grid grid-cols-2 gap-4">
                      <div className="border rounded-lg h-32 flex items-center justify-center overflow-hidden bg-gray-50">
                        {liveImagePreview ? (
                          <img src={liveImagePreview} alt="Live image preview" className="w-full h-full object-cover" />
                        ) : (
                          <div className="flex flex-col items-center justify-center text-gray-500">
                            <svg className="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H5a2 2 0 01-2-2V7a2 2 0 012-2h7l5 5v9a2 2 0 01-2 2z" /></svg>
                            <div className="text-sm">No Image</div>
                          </div>
                        )}
                      </div>
                      <label className="cursor-pointer border-2 border-dashed rounded-lg h-32 flex flex-col items-center justify-center text-gray-600 hover:bg-gray-50">
                        <div className="font-semibold">Upload Image</div>
                        <div className="text-xs mt-1">PNG, JPG, GIF up to 5MB</div>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            if (file.size > 5 * 1024 * 1024) { setSaveError('Image must be under 5MB'); return; }
                            if (!file.type.startsWith('image/')) { setSaveError('Please select an image file'); return; }
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              const result = ev.target?.result as string;
                              setLiveImagePreview(result);
                              setLiveImageUrl(result);
                            };
                            reader.readAsDataURL(file);
                          }}
                        />
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title <span className="text-red-500">*</span></label>
                    <input
                      type="text"
                      placeholder="Title"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
                      value={liveTitle}
                      onChange={(e)=>setLiveTitle(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      rows={6}
                      placeholder="Enter Live Stream Description"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
                      value={liveDescription}
                      onChange={(e)=>setLiveDescription(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Publish On <span className="text-red-500">*</span></label>
                    <input
                      type="datetime-local"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
                      value={publishOn}
                      onChange={(e)=>setPublishOn(e.target.value)}
                    />
                  </div>
                </>
              ) : (
                <div className="text-sm text-gray-600">Advanced options coming soon…</div>
              )}
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <button onClick={()=>setIsAddDrawerOpen(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-md">Cancel</button>
              <button disabled={isSaving} onClick={handleSaveLive} className={`px-4 py-2 text-sm rounded-md ${isSaving? 'bg-gray-400 text-white' : 'bg-black text-white'}`}>{isSaving? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </>
      )}

      {/* Go Live Modal */}
      {isGoLiveOpen && (
        <div className="fixed inset-0 z-[1000] flex items-start sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={()=>setIsGoLiveOpen(null)} />
          <div className="relative w-full sm:w-[900px] bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">Go Live</h3>
              <button className="w-8 h-8 rounded-full hover:bg-gray-100 flex items-center justify-center" onClick={()=>setIsGoLiveOpen(null)}>×</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">URL :</label>
                <div className="flex gap-2">
                  <input readOnly value={isGoLiveOpen.rtmp} className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-gray-700" />
                  <button onClick={()=>{ navigator.clipboard.writeText(isGoLiveOpen.rtmp); }} className="px-3 py-2 bg-gray-100 rounded-md">Copy</button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Stream Key :</label>
                <div className="flex gap-2">
                  <input readOnly value={isGoLiveOpen.key} className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-gray-700" />
                  <button onClick={()=>{ navigator.clipboard.writeText(isGoLiveOpen.key); }} className="px-3 py-2 bg-gray-100 rounded-md">Copy</button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Shareable Link :</label>
                <div className="flex gap-2">
                  <input readOnly value={isGoLiveOpen.share} className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-gray-700" />
                  <button onClick={()=>{ navigator.clipboard.writeText(isGoLiveOpen.share); }} className="px-3 py-2 bg-gray-100 rounded-md">Copy</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
