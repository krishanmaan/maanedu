'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';

// Types
interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  image_url: string;
  video_url: string;
  featured: boolean;
  created_at: string;
}

type Settings = {
  pricing?: {
    mrp?: string;
    discountCodes?: string;
    easyEmi?: boolean;
    isCombo?: boolean;
    intlPriceUptick?: boolean;
  };
  content?: {
    attachedTestSeriesSearch?: string;
    attachedBookId?: string;
  };
  validity?: {
    type?: 'set_validity' | 'end_date' | 'lifetime';
    unit?: string;
    value?: string;
    endDate?: string;
  };
  additional?: {
    sortingOrder?: string;
    chooseTabs?: boolean;
    markAsNewBatch?: boolean;
    disableInvoice?: boolean;
    enableTelegram?: boolean;
    metaTitle?: string;
    metaDescription?: string;
    richSnippets?: boolean;
    featureOnWebsite?: string;
    language?: string;
  };
};

function hasMessage(err: unknown): err is { message?: string } {
  return typeof err === 'object' && err !== null && 'message' in err;
}

export default function CourseSettings() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;
  
  // Get authenticated user's Supabase client
  const { currentUserId, isAuthenticated, supabaseClient, isLoading } = useAuth();

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    price: 0,
    featured: false as boolean,
    image_url: '',
    // Extended settings (mirrors Add Course)
    validityType: 'set_validity' as 'set_validity' | 'end_date' | 'lifetime',
    validity: 'months',
    validityValue: '6',
    endDate: '',
    mrp: '',
    discountCodes: '' as string,
    easyEmi: false,
    isCombo: false,
    intlPriceUptick: false,
    attachedTestSeriesSearch: '',
    attachedBookId: '',
    sortingOrder: '',
    chooseTabs: false,
    markAsNewBatch: false,
    disableInvoice: false,
    enableTelegram: false,
    metaTitle: '',
    metaDescription: '',
    richSnippets: false,
    featureOnWebsite: 'No',
    language: 'English'
  });

  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Load course data
  const loadCourse = useCallback(async () => {
    if (!supabaseClient) {
      console.log('No supabase client available');
      return;
    }
    
    try {
      setLoading(true);
      console.log('Fetching course data for ID:', courseId);
      
      const { data, error } = await supabaseClient
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();

      console.log('Course query result:', { data, error });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      if (!data) {
        throw new Error('No course found with the given ID');
      }
      
      console.log('Course data loaded successfully:', data);
      setCourse(data);
      const settings: Settings = (data as { settings?: Settings }).settings ?? {};
      const pricing = settings.pricing ?? {};
      const content = settings.content ?? {};
      const validity = settings.validity ?? {};
      const additional = settings.additional ?? {};

      setFormData({
        title: data.title || '',
        description: data.description || '',
        category: data.category || '',
        price: data.price || 0,
        featured: Boolean(data.featured),
        image_url: data.image_url || '',
        validityType: validity.type || 'set_validity',
        validity: validity.unit || 'months',
        validityValue: validity.value || '6',
        endDate: validity.endDate || '',
        mrp: pricing.mrp || '',
        discountCodes: pricing.discountCodes || '',
        easyEmi: Boolean(pricing.easyEmi),
        isCombo: Boolean(pricing.isCombo),
        intlPriceUptick: Boolean(pricing.intlPriceUptick),
        attachedTestSeriesSearch: content.attachedTestSeriesSearch || '',
        attachedBookId: content.attachedBookId || '',
        sortingOrder: additional.sortingOrder || '',
        chooseTabs: Boolean(additional.chooseTabs),
        markAsNewBatch: Boolean(additional.markAsNewBatch),
        disableInvoice: Boolean(additional.disableInvoice),
        enableTelegram: Boolean(additional.enableTelegram),
        metaTitle: additional.metaTitle || '',
        metaDescription: additional.metaDescription || '',
        richSnippets: Boolean(additional.richSnippets),
        featureOnWebsite: additional.featureOnWebsite || 'No',
        language: additional.language || 'English'
      });
      setImagePreview(data.image_url || null);
    } catch (error) {
      console.error('Error loading course:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load course details';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setLoading(false);
    }
  }, [courseId, supabaseClient]);

  useEffect(() => {
    console.log('Settings Page - Auth Debug:', {
      isLoading,
      isAuthenticated,
      currentUserId,
      supabaseClient: !!supabaseClient,
      courseId
    });
    
    if (isAuthenticated && supabaseClient && courseId) {
      console.log('Loading course data for courseId:', courseId);
      loadCourse();
    } else if (!courseId) {
      console.error('No courseId provided');
      setMessage({ type: 'error', text: 'No course ID provided' });
      setLoading(false);
    }
  }, [isAuthenticated, supabaseClient, loadCourse, courseId, isLoading, currentUserId]);

  // Show loading state while authenticating
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading authentication...</p>
        </div>
      </div>
    );
  }

  // Show auth prompt if not authenticated
  if (!isAuthenticated || !supabaseClient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h2>
          <p className="text-gray-600 mb-6">Please login to access course settings</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  const handleInputChange = (field: string, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: field === 'featured' ? Boolean(value) : value
    }));
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setImagePreview(result);
        setFormData(prev => ({ ...prev, image_url: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setImagePreview(result);
        setFormData(prev => ({ ...prev, image_url: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const removeImage = () => {
    setImagePreview(null);
    setFormData(prev => ({ ...prev, image_url: '' }));
  };

  const handleSave = async () => {
    if (!supabaseClient) {
      setMessage({ type: 'error', text: 'Database connection not available' });
      return;
    }
    
    if (!formData.title.trim()) {
      setMessage({ type: 'error', text: 'Course title is required' });
      return;
    }

    if (!courseId) {
      setMessage({ type: 'error', text: 'Course ID not found' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      console.log('Updating course with data:', {
        courseId,
        formData,
        supabaseClient: !!supabaseClient
      });

      // First, verify the course exists
      const { data: existingCourse, error: checkError } = await supabaseClient
        .from('courses')
        .select('id, title')
        .eq('id', courseId)
        .single();

      console.log('Course existence check:', { existingCourse, checkError });

      if (checkError) {
        throw new Error(`Course not found: ${checkError.message}`);
      }

      if (!existingCourse) {
        throw new Error('Course not found or you do not have permission to access it');
      }

      const settings = {
        pricing: {
          mrp: formData.mrp,
          discountCodes: formData.discountCodes,
          easyEmi: Boolean(formData.easyEmi),
          isCombo: Boolean(formData.isCombo),
          intlPriceUptick: Boolean(formData.intlPriceUptick)
        },
        content: {
          attachedTestSeriesSearch: formData.attachedTestSeriesSearch,
          attachedBookId: formData.attachedBookId
        },
        validity: {
          type: formData.validityType,
          unit: formData.validity,
          value: formData.validityValue,
          endDate: formData.endDate
        },
        additional: {
          sortingOrder: formData.sortingOrder,
          chooseTabs: Boolean(formData.chooseTabs),
          markAsNewBatch: Boolean(formData.markAsNewBatch),
          disableInvoice: Boolean(formData.disableInvoice),
          enableTelegram: Boolean(formData.enableTelegram),
          metaTitle: formData.metaTitle,
          metaDescription: formData.metaDescription,
          richSnippets: Boolean(formData.richSnippets),
          featureOnWebsite: formData.featureOnWebsite,
          language: formData.language
        }
      };

      const updateData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category.trim(),
        price: Number(formData.price) || 0,
        featured: Boolean(formData.featured),
        image_url: formData.image_url.trim() || null,
        settings
      };

      console.log('Update data prepared:', updateData);

      let updateResp = await supabaseClient
        .from('courses')
        .update(updateData)
        .eq('id', courseId)
        .select();

      // If settings column doesn't exist, retry without it
      if (updateResp.error && hasMessage(updateResp.error) && updateResp.error.message?.toLowerCase().includes('column "settings"')) {
        updateResp = await supabaseClient
          .from('courses')
          .update({
            title: updateData.title,
            description: updateData.description,
            category: updateData.category,
            price: updateData.price,
            featured: updateData.featured,
            image_url: updateData.image_url
          })
          .eq('id', courseId)
          .select();
      }

      console.log('Update result:', { data: updateResp.data, error: updateResp.error });

      if (updateResp.error) {
        console.error('Supabase update error:', updateResp.error);
        throw updateResp.error;
      }

      if (!updateResp.data || updateResp.data.length === 0) {
        throw new Error('No course was updated. Course may not exist or you may not have permission.');
      }

      setMessage({ type: 'success', text: 'Course settings updated successfully!' });
      loadCourse(); // Reload to get updated data
    } catch (error) {
      console.error('Error updating course:', error);
      
      let errorMessage = 'Failed to update course settings';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        // Handle Supabase error objects
        const supabaseError = error as { message?: string; details?: string; hint?: string; code?: string };
        if (supabaseError.message) {
          errorMessage = supabaseError.message;
        }
        if (supabaseError.details) {
          errorMessage += ` (Details: ${supabaseError.details})`;
        }
        if (supabaseError.hint) {
          errorMessage += ` (Hint: ${supabaseError.hint})`;
        }
        if (supabaseError.code) {
          errorMessage += ` (Code: ${supabaseError.code})`;
        }
      }
      
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this course? This action cannot be undone and will also delete all associated classes.')) return;
    if (!supabaseClient) return;

    setSaving(true);
    try {
      // First delete all classes associated with this course
      const { error: classesError } = await supabaseClient
        .from('classes')
        .delete()
        .eq('course_id', courseId);

      if (classesError) throw classesError;

      // Then delete the course
      const { error: courseError } = await supabaseClient
        .from('courses')
        .delete()
        .eq('id', courseId);

      if (courseError) throw courseError;

      setMessage({ type: 'success', text: 'Course deleted successfully!' });
      setTimeout(() => {
        router.push('/admin/digital-products');
      }, 2000);
    } catch (error) {
      console.error('Error deleting course:', error);
      setMessage({ type: 'error', text: 'Failed to delete course' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex-shrink-0">
        <div className="p-6">
          <div className="flex items-center mb-8">
            <button 
              onClick={() => router.push('/admin/')}
              className="mr-3 p-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-gray-900">Course Management</h1>
          </div>
          
          <nav className="space-y-2">
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Course</h3>
              <div className="space-y-1">
                <button
                  onClick={() => router.push('/admin/digital-products')}
                  className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                >
                  <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  All Courses
                </button>
                <button
                  onClick={() => router.push('/admin/add-course')}
                  className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                >
                  <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Add New Course
                </button>
              </div>
            </div>

            <div className="mb-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Current Course</h3>
              {course && (
                <div className="bg-gray-50 rounded-lg p-3 mb-3">
                  <div className="flex items-center">
                    {course.image_url && (
                      <div className="w-8 h-8 rounded-lg overflow-hidden mr-3">
                        <Image 
                          src={course.image_url} 
                          alt={course.title}
                          width={32}
                          height={32}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{course.title}</p>
                      <p className="text-xs text-gray-500">₹{course.price}</p>
                    </div>
                  </div>
                </div>
              )}
              <div className="space-y-1">
                <button
                  onClick={() => router.push(`/admin/courses/${courseId}/classes`)}
                  className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                >
                  <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Classes
                </button>
                <button
                  className="w-full flex items-center px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded-md"
                >
                  <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  Course Settings
                </button>
                <button
                  onClick={() => router.push(`/admin/courses/${courseId}/analytics`)}
                  className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                >
                  <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  Analytics
                </button>
              </div>
            </div>

            <div className="mb-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Tools</h3>
              <div className="space-y-1">
                <button 
                  onClick={async () => {
                    try {
                      console.log('Testing Supabase connection...');
                      const { data, error } = await supabaseClient?.from('courses').select('count').limit(1);
                      console.log('Connection test result:', { data, error });
                      if (error) {
                        setMessage({ type: 'error', text: `Connection test failed: ${error.message}` });
                      } else {
                        setMessage({ type: 'success', text: 'Database connection successful!' });
                      }
                    } catch (error) {
                      console.error('Test error:', error);
                      setMessage({ type: 'error', text: `Test failed: ${error}` });
                    }
                  }}
                  className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                >
                  <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Test Database
                </button>
                <button 
                  onClick={async () => {
                    try {
                      console.log('Testing course access for ID:', courseId);
                      const { data, error } = await supabaseClient?.from('courses').select('*').eq('id', courseId).single();
                      console.log('Course access test result:', { data, error });
                      if (error) {
                        setMessage({ type: 'error', text: `Course access failed: ${error.message}` });
                      } else {
                        setMessage({ type: 'success', text: `Course found: ${data?.title || 'Unknown'}` });
                      }
                    } catch (error) {
                      console.error('Course test error:', error);
                      setMessage({ type: 'error', text: `Course test failed: ${error}` });
                    }
                  }}
                  className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                >
                  <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  Test Course Access
                </button>
                <button 
                  onClick={() => {
                    console.log('=== DEBUG INFO ===');
                    console.log('Course ID:', courseId);
                    console.log('Current User ID:', currentUserId);
                    console.log('Is Authenticated:', isAuthenticated);
                    console.log('Supabase Client:', !!supabaseClient);
                    console.log('Course Data:', course);
                    console.log('Form Data:', formData);
                    console.log('Form Data Types:', {
                      title: typeof formData.title,
                      description: typeof formData.description,
                      category: typeof formData.category,
                      price: typeof formData.price,
                      featured: typeof formData.featured,
                      image_url: typeof formData.image_url
                    });
                    console.log('Loading State:', loading);
                    console.log('Saving State:', saving);
                    console.log('==================');
                    setMessage({ type: 'success', text: 'Debug info logged to console' });
                  }}
                  className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                >
                  <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  Debug Info
                </button>
              </div>
            </div>
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">Course Settings</h1>
              {course && (
                <p className="text-sm text-gray-600">{course.title}</p>
              )}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleDelete}
                disabled={saving}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                Delete Course
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className={`px-4 py-2 text-white rounded-md transition-colors flex items-center ${
                  saving 
                    ? 'bg-gray-400 cursor-not-allowed' 
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`px-6 py-4 ${
            message.type === 'success' 
              ? 'bg-green-50 border-l-4 border-green-400 text-green-700' 
              : 'bg-red-50 border-l-4 border-red-400 text-red-700'
          }`}>
            <div className="flex items-center">
              {message.type === 'success' ? (
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
              {message.text}
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 p-6 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Basic Information */}
              <div className="bg-white rounded-lg border border-gray-200 p-6 lg:col-span-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Basic Information</h2>
                
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Course Title*
                    </label>
                    <input
                      type="text"
                      value={formData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                      placeholder="Enter course title"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      rows={4}
                      className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                      placeholder="Enter course description"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Category
                      </label>
                      <input
                        type="text"
                        value={formData.category}
                        onChange={(e) => handleInputChange('category', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                        placeholder="Enter category"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Price (₹)
                      </label>
                      <input
                        type="number"
                        value={formData.price}
                        onChange={(e) => handleInputChange('price', parseFloat(e.target.value) || 0)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                        placeholder="Enter price"
                        min="0"
                      />
                    </div>
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="featured"
                      checked={Boolean(formData.featured)}
                      onChange={(e) => handleInputChange('featured', e.target.checked)}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="featured" className="ml-2 text-sm text-gray-700">
                      Featured Course
                    </label>
                  </div>
                </div>
              </div>

              {/* Course Image */}
              <div className="bg-white rounded-lg border border-gray-200 p-6 lg:col-span-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Course Image</h2>
                
                <div className="space-y-4">
                  {imagePreview ? (
                    <div className="relative w-full h-48 bg-gray-100 rounded-lg overflow-hidden">
                      <Image 
                        src={imagePreview} 
                        alt="Course preview" 
                        width={400}
                        height={192}
                        className="w-full h-full object-cover"
                      />
                      <button
                        onClick={removeImage}
                        className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <svg className="w-12 h-12 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <p className="text-sm text-gray-500">No image uploaded</p>
                      </div>
                    </div>
                  )}
                  
                  <div 
                    className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-colors"
                    onDragOver={handleImageDragOver}
                    onDrop={handleImageDrop}
                    onClick={() => document.getElementById('imageInput')?.click()}
                  >
                    <svg className="w-8 h-8 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-sm text-gray-600">Upload Course Image</p>
                    <p className="text-xs text-gray-500">Click or drag & drop your image here</p>
                    <input
                      id="imageInput"
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </div>
                </div>
              </div>

              {/* Validity */}
              <div className="bg-white rounded-lg border border-gray-200 p-6 lg:col-span-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Course Validity</h2>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">Validity</label>
                  <div className="border rounded-lg p-1 bg-white">
                    <div className="flex">
                      <button
                        onClick={() => handleInputChange('validityType', 'set_validity')}
                        className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          formData.validityType === 'set_validity'
                            ? 'bg-gray-200 text-gray-900'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        Set Validity
                      </button>
                      <button
                        onClick={() => handleInputChange('validityType', 'end_date')}
                        className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          formData.validityType === 'end_date'
                            ? 'bg-gray-200 text-gray-900'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        End Date
                      </button>
                      <button
                        onClick={() => handleInputChange('validityType', 'lifetime')}
                        className={`flex-1 py-2.5 px-4 rounded-md text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          formData.validityType === 'lifetime'
                            ? 'bg-gray-200 text-gray-900'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        Lifetime Access
                      </button>
                    </div>
                  </div>
                </div>

                {formData.validityType === 'set_validity' && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 mb-3">Duration Settings</label>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Duration</label>
                        <select
                          value={formData.validity}
                          onChange={(e) => handleInputChange('validity', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 text-sm"
                        >
                          <option value="days">Days</option>
                          <option value="weeks">Weeks</option>
                          <option value="months">Months</option>
                          <option value="years">Years</option>
                        </select>
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Value</label>
                        <input
                          type="number"
                          value={formData.validityValue}
                          onChange={(e) => handleInputChange('validityValue', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 text-sm"
                          min="1"
                          max="999"
                          placeholder="Enter number"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {formData.validityType === 'end_date' && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <label className="block text-sm font-medium text-gray-700 mb-3">End Date Settings</label>
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1">
                        <label className="block text-xs font-medium text-gray-600 mb-1">End Date</label>
                        <input
                          type="date"
                          value={formData.endDate}
                          onChange={(e) => handleInputChange('endDate', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 text-sm"
                          min={new Date().toISOString().split('T')[0]}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Pricing */}
              <div className="bg-white rounded-lg border border-gray-200 p-6 lg:col-span-8">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Pricing</h2>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">MRP</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                      <input
                        type="number"
                        value={formData.mrp}
                        onChange={(e) => handleInputChange('mrp', e.target.value)}
                        placeholder="Display the maximum price"
                        className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 placeholder-gray-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Discount Codes</label>
                    <input
                      type="text"
                      value={formData.discountCodes}
                      onChange={(e) => handleInputChange('discountCodes', e.target.value)}
                      placeholder="Type to search coupon codes"
                      className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 placeholder-gray-500"
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-start justify-between p-4 border rounded-md">
                      <div>
                        <div className="text-sm font-medium text-gray-800">Easy EMI</div>
                        <div className="text-xs text-gray-500">Enable students to pay the price in multiple installments</div>
                      </div>
                      <button
                        onClick={() => handleInputChange('easyEmi', !formData.easyEmi)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.easyEmi ? 'bg-blue-600' : 'bg-gray-200'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.easyEmi ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>

                    <div className="flex items-start justify-between p-4 border rounded-md">
                      <div>
                        <div className="text-sm font-medium text-gray-800">Make this a combo</div>
                        <div className="text-xs text-gray-500">Enable to combine and sell multiple courses as a single package</div>
                      </div>
                      <button
                        onClick={() => handleInputChange('isCombo', !formData.isCombo)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.isCombo ? 'bg-blue-600' : 'bg-gray-200'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.isCombo ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>

                    <div className="flex items-start justify-between p-4 border rounded-md">
                      <div>
                        <div className="text-sm font-medium text-gray-800">International Price Uptick</div>
                        <div className="text-xs text-gray-500">Enable to increase prices for international transactions.</div>
                      </div>
                      <button
                        onClick={() => handleInputChange('intlPriceUptick', !formData.intlPriceUptick)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.intlPriceUptick ? 'bg-blue-600' : 'bg-gray-200'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.intlPriceUptick ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="bg-white rounded-lg border border-gray-200 p-6 lg:col-span-4">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Content</h2>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Attach Test Series</label>
                    <input
                      type="text"
                      value={formData.attachedTestSeriesSearch}
                      onChange={(e) => handleInputChange('attachedTestSeriesSearch', e.target.value)}
                      placeholder="Search"
                      className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 placeholder-gray-500"
                    />
                    <p className="text-sm text-gray-500">Students who purchase the course can access them for free</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Attach Book</label>
                    <select
                      value={formData.attachedBookId}
                      onChange={(e) => handleInputChange('attachedBookId', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                    >
                      <option value="">Select Book</option>
                      <option value="sample">Sample Book</option>
                    </select>
                    <p className="text-sm text-gray-500">Students will be charged the price of the book along with the course fee</p>
                  </div>
                </div>
              </div>

              {/* Additional Settings */}
              <div className="bg-white rounded-lg border border-gray-200 p-6 lg:col-span-12">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Additional Settings</h2>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Sorting Order</label>
                    <input
                      type="number"
                      value={formData.sortingOrder}
                      onChange={(e) => handleInputChange('sortingOrder', e.target.value)}
                      placeholder="0.00"
                      className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                    />
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-start justify-between p-4 border rounded-md">
                      <div>
                        <div className="text-sm font-medium text-gray-800">Choose Tabs to Show on Course Page</div>
                        <div className="text-xs text-gray-500">Enable tabs to show on your Course Page (Ex: Doubts, Discussions etc.)</div>
                      </div>
                      <button
                        onClick={() => handleInputChange('chooseTabs', !formData.chooseTabs)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.chooseTabs ? 'bg-blue-600' : 'bg-gray-200'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.chooseTabs ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>

                    <div className="flex items-start justify-between p-4 border rounded-md">
                      <div>
                        <div className="text-sm font-medium text-gray-800">Mark As New Batch</div>
                        <div className="text-xs text-gray-500">Display a badge indicating that the course consists of a new batch</div>
                      </div>
                      <button
                        onClick={() => handleInputChange('markAsNewBatch', !formData.markAsNewBatch)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.markAsNewBatch ? 'bg-blue-600' : 'bg-gray-200'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.markAsNewBatch ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>

                    <div className="flex items-start justify-between p-4 border rounded-md">
                      <div>
                        <div className="text-sm font-medium text-gray-800">Disable Invoice</div>
                        <div className="text-xs text-gray-500">Switch on if you want to disable invoice for this course</div>
                      </div>
                      <button
                        onClick={() => handleInputChange('disableInvoice', !formData.disableInvoice)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.disableInvoice ? 'bg-blue-600' : 'bg-gray-200'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.disableInvoice ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>

                    <div className="flex items-start justify-between p-4 border rounded-md">
                      <div>
                        <div className="text-sm font-medium text-gray-800">Enable Telegram Integration</div>
                        <div className="text-xs text-gray-500">Give your community access to an exclusive Telegram channel.</div>
                      </div>
                      <button
                        onClick={() => handleInputChange('enableTelegram', !formData.enableTelegram)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.enableTelegram ? 'bg-blue-600' : 'bg-gray-200'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.enableTelegram ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>
                  </div>

                  <div className="border-t pt-6">
                    <h3 className="text-md font-semibold text-gray-900 mb-4">SEO Settings</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Meta Title</label>
                        <input
                          type="text"
                          value={formData.metaTitle}
                          onChange={(e) => handleInputChange('metaTitle', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                          placeholder="Enter Meta Title"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Meta Description</label>
                        <input
                          type="text"
                          value={formData.metaDescription}
                          onChange={(e) => handleInputChange('metaDescription', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                          placeholder="Enter Meta Description"
                        />
                      </div>
                      <div className="flex items-center justify-between p-4 border rounded-md">
                        <div className="text-sm font-medium text-gray-800">Enable Rich Snippets</div>
                        <button
                          onClick={() => handleInputChange('richSnippets', !formData.richSnippets)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.richSnippets ? 'bg-blue-600' : 'bg-gray-200'}`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.richSnippets ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Feature on Website</label>
                      <select
                        value={formData.featureOnWebsite}
                        onChange={(e) => handleInputChange('featureOnWebsite', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                      >
                        <option>No</option>
                        <option>Yes</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
                      <select
                        value={formData.language}
                        onChange={(e) => handleInputChange('language', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                      >
                        <option>English</option>
                        <option>Hindi</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
