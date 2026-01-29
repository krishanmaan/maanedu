'use client';

import { useEffect, useState } from 'react';
import { useSupabase, useAuth } from '../../../contexts/AuthContext';
import Sidebar from '../../../components/Sidebar';

interface Course {
  id: string;
  title: string;
  description: string;
  category?: string;
  price?: number;
  created_at?: string;
}

export default function CourseOverview({ params }: { params: { courseId: string } }) {
  const { courseId } = params;
  const supabase = useSupabase();
  const { isLoading: authLoading, isAuthenticated } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState('products');
  const [activeTab, setActiveTab] = useState<'overview' | 'content' | 'links' | 'forum' | 'chat' | 'posts'>('overview');

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        setLoading(true);
        if (!supabase) {
          throw new Error('Not authenticated');
        }
        const { data, error: err } = await supabase
          .from('courses')
          .select('*')
          .eq('id', courseId)
          .single();
        if (err) throw err;
        setCourse(data as Course);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Failed to load course';
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    if (!authLoading && isAuthenticated) {
      fetchCourse();
    }
  }, [courseId, supabase, authLoading, isAuthenticated]);

  if (authLoading || loading) {
    return (
      <div className="p-6">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="p-6">
        <div className="bg-yellow-50 text-yellow-800 px-4 py-3 rounded-md">Please log in to view this course.</div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="p-6">
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-md">{error || 'Course not found'}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar activeSection={activeSection} setActiveSection={setActiveSection} />
      <div className="pl-64 space-y-6 p-6">
      {/* Breadcrumbs */}
      <nav className="text-sm text-gray-500">
        <span className="hover:underline cursor-pointer" onClick={() => (window.location.href = '/admin')}>Dashboard</span>
        <span className="mx-2">/</span>
        <span className="hover:underline cursor-pointer" onClick={() => (window.location.href = '/admin/products')}>Products</span>
        <span className="mx-2">/</span>
        <span className="text-gray-900">{course.title}</span>
      </nav>

      <div className="flex items-start justify-between bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{course.title}</h1>
          <p className="text-gray-600 mt-1">{course.description}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => (window.location.href = `/admin/courses/${course.id}/classes`)}
            className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800"
            title="Add/View Content"
          >
            Add/View Content
          </button>
          <button
            onClick={() => (window.location.href = `/admin/add-course?edit=${course.id}`)}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700"
            title="Edit Course"
          >
            Edit
          </button>
        </div>
      </div>

      {/* Top tabs like reference UI */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-4 sm:px-6">
          <div className="flex gap-6 overflow-x-auto border-b border-gray-200">
            {([
              { id: 'overview', label: 'Overview' },
              { id: 'content', label: 'Content' },
              { id: 'links', label: 'Links' },
              { id: 'forum', label: 'Forum' },
              { id: 'chat', label: 'Chat' },
              { id: 'posts', label: 'Posts' }
            ] as { id: 'overview' | 'content' | 'links' | 'forum' | 'chat' | 'posts'; label: string }[]).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative -mb-px py-3 text-sm whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'text-gray-900 font-medium border-b-2 border-gray-900'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
            <div className="flex-1"/>
          </div>
        </div>

        {/* Overview summary card */}
        {activeTab === 'overview' && (
          <div className="p-4 sm:p-6">
            <div className="rounded-lg border border-gray-200">
              <div className="flex items-stretch justify-between p-4 sm:p-6">
                <div className="flex items-center gap-4">
                  <div className="w-40 h-28 sm:w-56 sm:h-36 rounded-md bg-gray-100 flex items-center justify-center">
                    <svg className="w-12 h-12 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 2l7 4v6c0 5-7 10-7 10S5 17 5 12V6l7-4z"/></svg>
                  </div>
                  <div>
                    <div className="text-xl font-semibold text-gray-900">{course.title}</div>
                    <div className="mt-1 text-sm text-gray-600">भाषा: हिंदी / English</div>
                    <div className="mt-3">
                      <span className="inline-flex items-center px-2 py-1 text-xs rounded-full bg-green-100 text-green-700">Published</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="text-gray-900 font-medium">₹{course.price || 0}</div>
                  <button
                    onClick={() => (window.location.href = `/admin/add-course?edit=${course.id}`)}
                    className="px-3 py-1.5 border border-gray-300 rounded-md text-sm hover:bg-gray-50 text-gray-700"
                  >
                    Edit
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Placeholder content for other tabs */}
        {activeTab !== 'overview' && (
          <div className="p-6 text-sm text-gray-600">{activeTab[0].toUpperCase() + activeTab.slice(1)} coming soon.</div>
        )}
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-sm text-gray-500">Category</div>
          <div className="mt-1">
            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
              {course.category || 'Uncategorized'}
            </span>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-sm text-gray-500">Price</div>
          <div className="mt-1 text-green-600 font-medium">₹{course.price || 0}</div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-sm text-gray-500">Created</div>
          <div className="mt-1 text-gray-900">{course.created_at ? new Date(course.created_at).toLocaleString() : '-'}</div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-wrap gap-3">
          <button onClick={() => (window.location.href = `/admin/courses/${course.id}`)} className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700">Overview</button>
          <button onClick={() => (window.location.href = `/admin/courses/${course.id}/classes`)} className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700">Add/View Content</button>
          <button onClick={() => (window.location.href = `/admin/add-course?edit=${course.id}`)} className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-gray-700">Edit Course</button>
        </div>
      </div>
      </div>
    </div>
  );
}
