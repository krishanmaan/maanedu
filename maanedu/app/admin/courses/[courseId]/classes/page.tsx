'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useMux } from '@/hooks/useMux';
import MuxPlayer from '@mux/mux-player-react';
import { getThumbnailUrl } from '@/lib/mux';

// Types
interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  price: number;
  image_url: string;
  created_at: string;
}

interface Class {
  id: string;
  course_id: string;
  title: string;
  description: string;
  video_url: string;
  mux_asset_id?: string;
  mux_playback_id?: string;
  image_url?: string;
  duration_minutes: number;
  order_index: number;
  is_free: boolean;
  created_at: string;
}

// Dynamic Supabase client will be provided by useSupabase hook

export default function CourseClassesManagement() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.courseId as string;

  // Get authenticated user's Supabase client
  const { currentUserId, isAuthenticated, supabaseClient, isLoading } = useAuth();

  const [course, setCourse] = useState<Course | null>(null);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'warning', text: string } | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState<string | null>(null);
  const [videoSource, setVideoSource] = useState<'mux' | 'youtube'>('mux');
  const [youtubeUrl, setYoutubeUrl] = useState<string>('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    video_url: '',
    mux_asset_id: '',
    mux_playback_id: '',
    image_url: '',
    duration_minutes: 0,
    is_free: false
  });
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [isVideoProcessing, setIsVideoProcessing] = useState(false);
  const [videoProcessingStatus, setVideoProcessingStatus] = useState<string>('');

  // Mux integration
  const { uploadState, uploadVideo, pollAssetStatus, resetUploadState } = useMux();

  const isYouTubeUrl = (url: string): boolean => {
    try {
      const u = new URL(url);
      if (u.hostname.includes('youtube.com')) return true;
      if (u.hostname === 'youtu.be') return true;
      return false;
    } catch {
      return false;
    }
  };

  const extractYouTubeId = (url: string): string | null => {
    try {
      const u = new URL(url);
      if (u.hostname === 'youtu.be') {
        return u.pathname.replace('/', '') || null;
      }
      if (u.hostname.includes('youtube.com')) {
        const id = u.searchParams.get('v');
        if (id) return id;
        const parts = u.pathname.split('/').filter(Boolean);
        if (parts.length >= 2 && (parts[0] === 'live' || parts[0] === 'embed' || parts[0] === 'shorts')) {
          return parts[1] || null;
        }
      }
    } catch {
      return null;
    }
    return null;
  };

  // Helper function to get video thumbnail
  const getVideoThumbnail = (classItem: Class): string | null => {
    if (classItem.mux_playback_id) {
      return getThumbnailUrl(classItem.mux_playback_id, { width: 64, height: 48, fit_mode: 'crop' });
    }
    return classItem.image_url || null;
  };

  // All useCallback hooks must be at top level, before any conditional returns
  const loadCourse = useCallback(async () => {
    if (!supabaseClient) return;
    try {
      const { data, error } = await supabaseClient
        .from('courses')
        .select('*')
        .eq('id', courseId)
        .single();

      if (error) throw error;
      setCourse(data);
    } catch (error) {
      console.error('Error loading course:', error);
      setMessage({ type: 'error', text: 'Failed to load course details' });
    }
  }, [courseId, supabaseClient]);

  const loadClasses = useCallback(async () => {
    if (!supabaseClient) return;
    try {
      setLoading(true);
      console.log('Loading classes for course:', courseId);

      const { data, error } = await supabaseClient
        .from('classes')
        .select('*')
        .eq('course_id', courseId)
        .order('order_index', { ascending: true });

      if (error) {
        console.error('Supabase classes load error:', error);
        throw error;
      }

      console.log('Loaded classes data:', data);
      setClasses(data || []);
    } catch (error) {
      console.error('Error loading classes:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to load classes';
      setMessage({ type: 'error', text: `Error loading classes: ${errorMessage}` });
    } finally {
      setLoading(false);
    }
  }, [courseId, supabaseClient]);

  // Debug authentication state
  useEffect(() => {
    console.log('Classes Page - Auth Debug:', {
      isLoading,
      isAuthenticated,
      currentUserId,
      supabaseClient: !!supabaseClient
    });

    if (!isLoading && !isAuthenticated) {
      console.log('User not authenticated - showing auth prompt instead of redirect');
      // Don't auto-redirect, let user see the auth prompt
    }
  }, [isLoading, isAuthenticated, currentUserId, supabaseClient, router]);

  useEffect(() => {
    if (isAuthenticated && supabaseClient) {
      loadCourse();
      loadClasses();
    }
  }, [isAuthenticated, supabaseClient, loadCourse, loadClasses]);

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
          <p className="text-gray-600 mb-6">Please login to access class management</p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Login
          </button>
          <div className="mt-4 text-sm text-gray-500">
            Debug: isAuthenticated={String(isAuthenticated)}, supabaseClient={String(!!supabaseClient)}, currentUserId={currentUserId}
          </div>
          <div className="mt-2">
            <button
              onClick={() => {
                // Try to use legacy localStorage auth as fallback
                const legacyAuth = localStorage.getItem('isAuthenticated');
                const orgId = localStorage.getItem('orgId');
                console.log('Checking legacy auth:', { legacyAuth, orgId });
                if (legacyAuth === 'true' && orgId) {
                  console.log('Found legacy auth, attempting to restore...');
                  // Force reload the auth context
                  window.location.reload();
                }
              }}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
            >
              Check Legacy Auth
            </button>
          </div>
        </div>
      </div>
    );
  }

  const supabase = supabaseClient;

  const handleInputChange = (field: string, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleThumbnailUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setThumbnailPreview(result);
        setFormData(prev => ({ ...prev, image_url: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleThumbnailDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setThumbnailPreview(result);
        setFormData(prev => ({ ...prev, image_url: result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleThumbnailDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const removeThumbnail = () => {
    setThumbnailPreview(null);
    setFormData(prev => ({ ...prev, image_url: '' }));
  };

  // Video Upload Handlers
  const handleVideoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleVideoFile(file);
    }
  };

  // Helper function to get video duration from file
  const getVideoDuration = (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      console.log('Starting duration detection for file:', file.name, 'type:', file.type, 'size:', file.size);

      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.crossOrigin = 'anonymous';
      video.style.position = 'absolute';
      video.style.left = '-9999px';
      video.style.top = '-9999px';
      video.style.width = '1px';
      video.style.height = '1px';

      // Add to DOM
      document.body.appendChild(video);

      const cleanup = () => {
        try {
          if (video.src) {
            window.URL.revokeObjectURL(video.src);
          }
          if (video.parentNode) {
            video.parentNode.removeChild(video);
          }
        } catch (e) {
          console.warn('Cleanup error:', e);
        }
      };

      // Set a timeout
      const timeout = setTimeout(() => {
        console.error('Duration detection timeout');
        cleanup();
        reject(new Error('Timeout loading video metadata'));
      }, 15000); // 15 second timeout

      const handleSuccess = () => {
        clearTimeout(timeout);
        const duration = video.duration;
        console.log('Duration detected successfully:', duration, 'seconds');

        if (isNaN(duration) || duration <= 0) {
          console.error('Invalid duration detected:', duration);
          cleanup();
          reject(new Error('Invalid video duration detected'));
          return;
        }

        cleanup();
        resolve(duration);
      };

      const handleError = (e: Event | Error) => {
        clearTimeout(timeout);
        console.error('Video metadata error:', e);
        cleanup();
        const errorMessage = e instanceof Error ? e.message : 'Unknown error';
        reject(new Error(`Video metadata error: ${errorMessage}`));
      };

      // Multiple event listeners for better compatibility
      video.addEventListener('loadedmetadata', handleSuccess, { once: true });
      video.addEventListener('error', (e) => handleError(e as Event), { once: true });
      video.addEventListener('canplay', handleSuccess, { once: true });

      // Legacy event handlers
      video.onloadedmetadata = handleSuccess;
      video.onerror = (e) => handleError(e as Event);
      video.oncanplay = handleSuccess;

      try {
        const objectURL = URL.createObjectURL(file);
        video.src = objectURL;
        console.log('Video src set, loading...');

        // Force load
        video.load();

        // Try to play to trigger metadata loading (some browsers need this)
        video.play().catch(() => {
          // Ignore play errors, we just want metadata
          console.log('Play failed, but that\'s okay for metadata loading');
        });

      } catch (error) {
        clearTimeout(timeout);
        console.error('Error setting video src:', error);
        cleanup();
        reject(new Error(`Error setting video source: ${error}`));
      }
    });
  };

  // Alternative duration detection method
  const getVideoDurationAlternative = (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      console.log('Trying alternative duration detection method');

      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.style.display = 'none';

      // Don't add to DOM for this method
      const cleanup = () => {
        try {
          if (video.src) {
            window.URL.revokeObjectURL(video.src);
          }
        } catch (e) {
          console.warn('Alternative cleanup error:', e);
        }
      };

      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error('Alternative method timeout'));
      }, 10000);

      video.onloadedmetadata = () => {
        clearTimeout(timeout);
        const duration = video.duration;
        console.log('Alternative method duration:', duration);
        cleanup();
        resolve(duration);
      };

      video.onerror = (e) => {
        clearTimeout(timeout);
        console.error('Alternative method error:', e);
        cleanup();
        reject(new Error('Alternative method failed'));
      };

      try {
        video.src = URL.createObjectURL(file);
      } catch (error) {
        clearTimeout(timeout);
        cleanup();
        reject(error);
      }
    });
  };

  const handleVideoFile = async (file: File) => {
    // Check if it's a video file
    if (!file.type.startsWith('video/')) {
      setMessage({ type: 'error', text: 'Please select a valid video file' });
      return;
    }

    // Mux can handle large files better than base64
    const maxSize = 10 * 1024 * 1024 * 1024; // 10GB (Mux limit)

    if (file.size > maxSize) {
      setMessage({ type: 'error', text: 'Video file size should be less than 10GB' });
      return;
    }

    setVideoFile(file);
    setIsVideoProcessing(true);
    setVideoProcessingStatus('Analyzing video...');

    // Create preview URL for immediate feedback
    const url = URL.createObjectURL(file);
    setVideoPreview(url);

    try {
      // Get video duration from local file first
      let localDuration = 0;
      try {
        setVideoProcessingStatus('Detecting video duration...');
        console.log('Starting duration detection for file:', file.name, 'type:', file.type, 'size:', file.size);

        // Try multiple methods for duration detection
        try {
          localDuration = await getVideoDuration(file);
        } catch (videoError) {
          console.warn('Video element method failed, trying alternative method:', videoError);
          // Fallback: try with a different approach
          localDuration = await getVideoDurationAlternative(file);
        }

        // Store duration in seconds for accuracy, but display appropriately
        const durationSeconds = Math.round(localDuration);
        console.log('Duration detection successful:', localDuration, 'seconds, storing as', durationSeconds, 'seconds');

        setFormData(prev => ({
          ...prev,
          duration_minutes: durationSeconds // We'll store seconds in this field for now
        }));

        const displayDuration = durationSeconds < 60 ? `${durationSeconds} sec` : `${Math.floor(durationSeconds / 60)}:${String(Math.floor(durationSeconds % 60)).padStart(2, '0')}`;
        setVideoProcessingStatus(`✅ Duration auto-detected: ${displayDuration}. Preparing upload...`);
      } catch (durationError) {
        console.warn('All duration detection methods failed:', durationError);
        setMessage({ type: 'warning', text: `Duration detection failed: ${durationError instanceof Error ? durationError.message : 'Unknown error'}. Will use default duration.` });
        setVideoProcessingStatus('Preparing upload...');
      }

      // Upload to Mux
      setVideoProcessingStatus('Uploading to Mux...');
      const { assetId } = await uploadVideo(file);

      setVideoProcessingStatus('Processing video...');

      // Store asset ID immediately (even if processing isn't complete)
      setFormData(prev => ({
        ...prev,
        mux_asset_id: assetId,
        video_url: `mux://${assetId}` // Temporary URL using asset ID
      }));

      try {
        // Poll for asset status with timeout handling
        const asset = await pollAssetStatus(assetId, (status) => {
          setVideoProcessingStatus(`Processing: ${status}`);
        });

        // Update form data with final playback information
        const playbackId = asset.playback_ids?.[0]?.id;
        if (playbackId) {
          // Use Mux duration if available, otherwise keep local duration
          let finalDurationMinutes = 0;

          if (asset.duration && asset.duration > 0) {
            // Store duration in seconds for accuracy
            finalDurationMinutes = Math.round(asset.duration);
            const displayDuration = finalDurationMinutes < 60 ? `${finalDurationMinutes} sec` : `${Math.floor(finalDurationMinutes / 60)}:${String(Math.floor(finalDurationMinutes % 60)).padStart(2, '0')}`;
            console.log('Mux duration detected:', asset.duration, 'seconds, storing as', finalDurationMinutes, 'seconds ( ', displayDuration, ')');
          } else if (localDuration > 0) {
            finalDurationMinutes = Math.round(localDuration);
            const displayDuration = finalDurationMinutes < 60 ? `${finalDurationMinutes} sec` : `${Math.floor(finalDurationMinutes / 60)}:${String(Math.floor(finalDurationMinutes % 60)).padStart(2, '0')}`;
            console.log('Using local duration:', localDuration, 'seconds, storing as', finalDurationMinutes, 'seconds ( ', displayDuration, ')');
          } else {
            finalDurationMinutes = 60; // Default fallback: 60 seconds (1 minute)
            console.log('No duration detected, using default: 60 seconds');
          }

          setFormData(prev => ({
            ...prev,
            video_url: `mux://${playbackId}`, // Final URL with playback ID
            mux_playback_id: playbackId,
            duration_minutes: finalDurationMinutes
          }));

          setMessage({ type: 'success', text: 'Video uploaded and processed successfully!' });
          setVideoProcessingStatus('Ready!');
        } else {
          // Asset exists but no playback ID yet - this can happen
          setMessage({
            type: 'success',
            text: 'Video uploaded! Processing may take a few more minutes.'
          });
          setVideoProcessingStatus('Processing in background...');
        }
      } catch (pollError) {
        console.warn('Asset polling failed, but upload succeeded:', pollError);

        // Don't fail the entire upload - the video was uploaded successfully
        setMessage({
          type: 'success',
          text: 'Video uploaded successfully! Processing may take a few minutes to complete.'
        });
        setVideoProcessingStatus('Processing in background...');

        // The asset ID is still valid, just processing might take longer
      }

    } catch (error) {
      console.error('Error uploading video to Mux:', error);

      let errorMessage = 'Failed to upload video to Mux';

      if (error instanceof Error) {
        if (error.message.includes('credentials')) {
          errorMessage = 'Mux credentials not configured. Please check your .env.local file.';
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage = 'Network error. Please check your internet connection and try again.';
        } else {
          errorMessage = error.message;
        }
      }

      setMessage({ type: 'error', text: errorMessage });
      removeVideo();
    } finally {
      setIsVideoProcessing(false);
    }
  };

  const handleVideoDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      handleVideoFile(file);
    }
  };

  const handleVideoDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const removeVideo = () => {
    setVideoFile(null);
    setVideoPreview(null);
    setIsVideoProcessing(false);
    setVideoProcessingStatus('');
    resetUploadState();
    setFormData(prev => ({
      ...prev,
      video_url: '',
      mux_asset_id: '',
      mux_playback_id: ''
    }));
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
    }
    if (videoSource === 'youtube') {
      setYoutubeUrl('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      setMessage({ type: 'error', text: 'Class title is required' });
      return;
    }

    // Validate video based on source
    if (videoSource === 'youtube') {
      if (!youtubeUrl.trim() || !isYouTubeUrl(youtubeUrl.trim())) {
        setMessage({ type: 'error', text: 'Please enter a valid YouTube video/live URL' });
        return;
      }
    } else {
      if (!formData.video_url.trim()) {
        setMessage({ type: 'error', text: 'Class video is required' });
        return;
      }
    }

    // Ensure duration is set (should be auto-detected)
    if (formData.duration_minutes <= 0) {
      console.warn('Duration not detected, setting default value of 60 seconds');
      setFormData(prev => ({
        ...prev,
        duration_minutes: 60 // Default to 60 seconds (1 minute) if detection fails
      }));
    }

    if (isVideoProcessing) {
      setMessage({ type: 'error', text: 'Please wait for video processing to complete' });
      return;
    }

    try {
      // Resolve video fields based on source
      let effectiveVideoUrl = formData.video_url;
      let effectiveMuxPlaybackId: string | undefined = formData.mux_playback_id || undefined;

      if (videoSource === 'youtube') {
        const normalizedUrl = youtubeUrl.trim();
        effectiveVideoUrl = normalizedUrl;
        effectiveMuxPlaybackId = undefined;
      } else {
        // If playback ID is missing but we have an asset ID, try to fetch it from Mux
        if (!effectiveMuxPlaybackId && formData.mux_asset_id) {
          try {
            const res = await fetch(`/api/mux/asset/${formData.mux_asset_id}`);
            const data = await res.json();
            const playbackId = data?.asset?.playback_ids?.[0]?.id as string | undefined;
            if (playbackId) {
              effectiveMuxPlaybackId = playbackId;
              effectiveVideoUrl = `mux://${playbackId}`;
            }
          } catch (e) {
            console.warn('Could not retrieve playback ID before save; proceeding with asset ID.', e);
          }
        }
      }

      // Prepare class data - include Mux asset information
      const classData: {
        title: string;
        description: string;
        video_url: string;
        mux_asset_id?: string;
        mux_playback_id?: string;
        duration_minutes: number;
        is_free: boolean;
        course_id: string;
        order_index: number;
        image_url?: string;
      } = {
        title: formData.title,
        description: formData.description,
        video_url: effectiveVideoUrl,
        duration_minutes: formData.duration_minutes,
        is_free: formData.is_free,
        course_id: courseId,
        order_index: editingClass ? editingClass.order_index : classes.length + 1
      };

      // Add source-specific fields
      if (videoSource === 'youtube') {
        // Clear Mux-specific fields on YouTube entries
        delete classData.mux_asset_id;
        delete classData.mux_playback_id;
      } else {
        if (formData.mux_asset_id) {
          classData.mux_asset_id = formData.mux_asset_id;
        }
        if (effectiveMuxPlaybackId) {
          classData.mux_playback_id = effectiveMuxPlaybackId;
        }
      }

      // Only add image_url if it exists
      if (formData.image_url && formData.image_url.trim()) {
        classData.image_url = formData.image_url;
      }

      console.log('Saving class data:', classData);
      console.log('Duration being saved:', classData.duration_minutes, 'minutes');
      console.log('Course ID:', courseId);
      console.log('Current User ID:', currentUserId);
      console.log('User-specific Supabase connection active');

      // Test connection first
      console.log('Testing Supabase connection...');
      const connectionTest = await supabase.from('classes').select('count').limit(1);
      console.log('Connection test result:', connectionTest);

      if (editingClass) {
        // Update existing class
        const { error } = await supabase
          .from('classes')
          .update(classData)
          .eq('id', editingClass.id);

        if (error) {
          console.error('Supabase update error:', error);
          throw error;
        }
        setMessage({ type: 'success', text: 'Class updated successfully!' });
      } else {
        // Add new class
        const { error } = await supabase
          .from('classes')
          .insert([classData]);

        if (error) {
          console.error('Supabase insert error:', error);
          throw error;
        }
        setMessage({ type: 'success', text: 'Class added successfully!' });
      }

      // Reset form and reload classes
      setFormData({
        title: '',
        description: '',
        video_url: '',
        mux_asset_id: '',
        mux_playback_id: '',
        image_url: '',
        duration_minutes: 0,
        is_free: false
      });
      setThumbnailPreview(null);
      setShowAddForm(false);
      setEditingClass(null);
      removeVideo();
      setVideoSource('mux');
      setYoutubeUrl('');
      loadClasses();

    } catch (error) {
      console.error('Error saving class:', error);
      console.error('Full error object:', JSON.stringify(error, null, 2));

      let errorMessage = 'Failed to save class';
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        // Supabase error object structure
        const supabaseError = error as { message?: string; details?: string; hint?: string };
        if (supabaseError.message) {
          errorMessage = supabaseError.message;
        }
        if (supabaseError.details) {
          errorMessage += ` (Details: ${supabaseError.details})`;
        }
        if (supabaseError.hint) {
          errorMessage += ` (Hint: ${supabaseError.hint})`;
        }
      }

      setMessage({ type: 'error', text: `Error: ${errorMessage}` });
    }
  };

  const handleEdit = (classItem: Class) => {
    setEditingClass(classItem);
    setFormData({
      title: classItem.title,
      description: classItem.description || '',
      video_url: classItem.video_url || '',
      mux_asset_id: classItem.mux_asset_id || '',
      mux_playback_id: classItem.mux_playback_id || '',
      image_url: classItem.image_url || '',
      duration_minutes: classItem.duration_minutes || 0,
      is_free: Boolean(classItem.is_free) // Ensure proper boolean conversion
    });
    setThumbnailPreview(classItem.image_url || null);

    // Handle existing video - check if it's YouTube, Mux or legacy base64
    if (classItem.video_url && isYouTubeUrl(classItem.video_url)) {
      setVideoSource('youtube');
      setYoutubeUrl(classItem.video_url);
      setVideoPreview(null);
      setVideoFile(null);
    } else if (classItem.video_url && classItem.video_url.startsWith('mux://')) {
      // Mux video - no preview needed, will be handled by MuxPlayer
      setVideoSource('mux');
      setVideoPreview(null);
      setVideoFile(null);
    } else if (classItem.video_url && classItem.video_url.startsWith('data:video/')) {
      // Legacy base64 video
      setVideoSource('mux');
      setVideoPreview(classItem.video_url);
      setVideoFile(null);
    } else {
      setVideoSource('mux');
      setVideoPreview(null);
      setVideoFile(null);
    }

    setShowAddForm(true);
  };

  const handleDelete = async (classId: string) => {
    if (!confirm('Are you sure you want to delete this class? If you delete a video, you will not get it again.')) return;

    try {
      const res = await fetch(`/api/classes/${classId}?userId=${encodeURIComponent(currentUserId || '')}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        console.error('API delete error:', data);
        setMessage({ type: 'error', text: `Failed to delete class${data?.error ? `: ${data.error}` : ''}` });
        return;
      }
      setMessage({ type: 'success', text: 'Class deleted successfully!' });
      loadClasses();
    } catch (error) {
      console.error('Error deleting class:', error);
      setMessage({ type: 'error', text: 'Failed to delete class' });
    }
  };

  const cancelForm = () => {
    setShowAddForm(false);
    setEditingClass(null);
    setThumbnailPreview(null);

    // Clean up video state
    if (videoPreview) {
      URL.revokeObjectURL(videoPreview);
    }
    setVideoFile(null);
    setVideoPreview(null);

    setFormData({
      title: '',
      description: '',
      video_url: '',
      mux_asset_id: '',
      mux_playback_id: '',
      image_url: '',
      duration_minutes: 0,
      is_free: false
    });
  };

  // Debug function to test Supabase connection
  const testSupabaseConnection = async () => {
    try {
      console.log('=== SUPABASE CONNECTION TEST ===');

      // Test 1: Basic connection
      const { data: testData, error: testError } = await supabase
        .from('classes')
        .select('count');

      console.log('Basic connection test:', { data: testData, error: testError });

      if (testError) {
        setMessage({ type: 'error', text: `Test failed: ${testError.message}` });
      } else {
        let total: number | 'ok' = 'ok';
        if (Array.isArray(testData) && testData.length > 0) {
          const firstRow = testData[0] as { count?: unknown };
          if (typeof firstRow.count === 'number') {
            total = firstRow.count;
          }
        }
        setMessage({ type: 'success', text: `Database connection successful (${total})` });
      }

    } catch (error) {
      console.error('Test error:', error);
      setMessage({ type: 'error', text: `Test exception: ${error}` });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200 flex-shrink-0">
        <div className="p-6">
          <div className="flex items-center mb-8">
            <button
              onClick={() => router.push('/admin/digital-products')}
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
                  className="w-full flex items-center px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded-md"
                >
                  <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  Classes ({classes.length})
                </button>
                <button
                  onClick={() => router.push(`/admin/courses/${courseId}/settings`)}
                  className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
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
                  onClick={testSupabaseConnection}
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
                      const response = await fetch('/api/mux/test');
                      const data = await response.json();
                      setMessage({
                        type: data.success ? 'success' : 'error',
                        text: data.success ? 'Mux connection successful!' : `Mux error: ${data.error}`
                      });
                      console.log('Mux test result:', data);
                    } catch (error) {
                      setMessage({ type: 'error', text: 'Failed to test Mux connection' });
                      console.error('Mux test error:', error);
                    }
                  }}
                  className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                >
                  <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Test Mux
                </button>
                <button
                  onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'video/*';
                    input.onchange = async (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) {
                        try {
                          console.log('Testing duration detection with file:', file.name);
                          const duration = await getVideoDuration(file);
                          const minutes = Math.round(duration / 60);
                          setMessage({
                            type: 'success',
                            text: `Duration test successful: ${minutes} minutes (${duration} seconds)`
                          });
                        } catch (error) {
                          setMessage({
                            type: 'error',
                            text: `Duration test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
                          });
                        }
                      }
                    };
                    input.click();
                  }}
                  className="w-full flex items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                >
                  <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Test Duration
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
              <h1 className="text-xl font-semibold text-gray-900">Course Classes</h1>
              {course && (
                <p className="text-sm text-gray-600">{course.title}</p>
              )}
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add New Class
            </button>
          </div>
        </div>

        {/* Message Display */}
        {message && (
          <div className={`px-6 py-4 ${message.type === 'success'
            ? 'bg-green-50 border-l-4 border-green-400 text-green-700'
            : message.type === 'warning'
              ? 'bg-yellow-50 border-l-4 border-yellow-400 text-yellow-700'
              : 'bg-red-50 border-l-4 border-red-400 text-red-700'
            }`}>
            <div className="flex items-center">
              {message.type === 'success' ? (
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              ) : message.type === 'warning' ? (
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
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
          {/* Course Info Card */}
          {course && (
            <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
              <div className="flex items-center">
                {course.image_url && (
                  <div className="w-16 h-16 rounded-lg overflow-hidden mr-4">
                    <Image
                      src={course.image_url}
                      alt={course.title}
                      width={64}
                      height={64}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">{course.title}</h2>
                  <p className="text-sm text-gray-600">{course.category} • ₹{course.price}</p>
                  <p className="text-sm text-gray-500 mt-1">{classes.length} classes</p>
                </div>
              </div>
            </div>
          )}

          {/* Add/Edit Class Form */}
          {showAddForm && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-lg p-8 mb-6">
              <div className="flex items-center mb-6">
                <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                  <svg className="h-5 w-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {editingClass ? 'Edit Class' : 'Add New Class'}
                </h3>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Class Title*
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => handleInputChange('title', e.target.value)}
                    placeholder="Enter class title"
                    className="w-full px-4 py-3 border text-gray-700 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Enter class description"
                    rows={4}
                    className="w-full px-4 py-3 border text-gray-700 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors resize-none"
                  />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Video Upload Section */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Class Video*
                    </label>
                    <div className="space-y-3">
                      {/* Source Toggle */}
                      <div className="inline-flex rounded-md shadow-sm" role="group">
                        <button
                          type="button"
                          onClick={() => setVideoSource('mux')}
                          className={`px-3 py-1.5 text-sm font-medium border ${videoSource === 'mux' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'} rounded-l-md`}
                          disabled={isVideoProcessing}
                        >
                          Mux Upload
                        </button>
                        <button
                          type="button"
                          onClick={() => { setVideoSource('youtube'); removeVideo(); }}
                          className={`px-3 py-1.5 text-sm font-medium border-t border-b ${videoSource === 'youtube' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-300'} rounded-r-md`}
                          disabled={isVideoProcessing}
                        >
                          YouTube Link
                        </button>
                      </div>

                      {videoSource === 'youtube' ? (
                        <div className="space-y-3">
                          <input
                            type="url"
                            value={youtubeUrl}
                            onChange={(e) => setYoutubeUrl(e.target.value)}
                            placeholder="Paste YouTube video or live URL (e.g. https://youtu.be/ID or https://www.youtube.com/watch?v=ID)"
                            className="w-full px-4 py-3 border text-gray-700 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                          />
                          {youtubeUrl && isYouTubeUrl(youtubeUrl) && extractYouTubeId(youtubeUrl) && (
                            <div className="relative w-full  bg-black rounded-lg overflow-hidden shadow-md" style={{ aspectRatio: '16/9' }}>
                              <iframe
                                src={`https://www.youtube.com/embed/${extractYouTubeId(youtubeUrl)}?rel=0`}
                                className="w-full h-full"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                allowFullScreen
                                title="YouTube preview"
                              />
                              <button
                                onClick={() => setYoutubeUrl('')}
                                type="button"
                                className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          )}
                          <p className="text-xs text-gray-500">Supports regular videos and YouTube Live URLs.</p>
                        </div>
                      ) : (
                        <div>
                          {/* Mux Video Player for existing Mux videos */}
                          {formData.mux_playback_id && !videoPreview ? (
                            <div className="relative w-full  bg-black rounded-lg overflow-hidden shadow-md" style={{ aspectRatio: '16/9' }}>
                              <MuxPlayer
                                playbackId={formData.mux_playback_id}
                                metadata={{
                                  video_title: formData.title || 'Class Video',
                                }}
                                style={{ height: '100%', width: '100%' }}
                              />
                              <button
                                onClick={removeVideo}
                                className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          ) : videoPreview ? (
                            <div className="relative w-full  bg-black rounded-lg overflow-hidden shadow-md" style={{ aspectRatio: '16/9' }}>
                              <video
                                src={videoPreview}
                                controls
                                className="w-full h-full object-contain"
                                preload="metadata"
                              />
                              <button
                                onClick={removeVideo}
                                className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
                              >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                              {isVideoProcessing && (
                                <div className="absolute inset-0 bg-black bg-opacity-75 flex items-center justify-center">
                                  <div className="text-center text-white">
                                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mx-auto mb-2"></div>
                                    <p className="text-xs">{videoProcessingStatus}</p>
                                    {uploadState.uploadProgress > 0 && (
                                      <div className="w-24 bg-gray-600 rounded-full h-1.5 mt-2">
                                        <div
                                          className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                                          style={{ width: `${uploadState.uploadProgress}%` }}
                                        ></div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div
                              className={`w-full  border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 shadow-sm ${isVideoProcessing ? 'pointer-events-none opacity-50' : ''
                                }`}
                              style={{ aspectRatio: '16/9' }}
                              onDrop={handleVideoDrop}
                              onDragOver={handleVideoDragOver}
                              onClick={() => !isVideoProcessing && document.getElementById('video-upload')?.click()}
                            >
                              <div className="text-center p-4">
                                {isVideoProcessing ? (
                                  <>
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-3"></div>
                                    <p className="text-xs text-gray-600 font-medium">{videoProcessingStatus}</p>
                                    {uploadState.uploadProgress > 0 && (
                                      <div className="w-24 bg-gray-200 rounded-full h-1.5 mt-2 mx-auto">
                                        <div
                                          className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                                          style={{ width: `${uploadState.uploadProgress}%` }}
                                        ></div>
                                      </div>
                                    )}
                                  </>
                                ) : (
                                  <>
                                    <div className="mx-auto h-10 w-10 text-gray-400 mb-3">
                                      <svg stroke="currentColor" fill="none" viewBox="0 0 48 48" className="w-full h-full">
                                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                                      </svg>
                                    </div>
                                    <p className="text-sm font-semibold text-gray-700 mb-1">
                                      Upload Video
                                    </p>
                                    <p className="text-xs text-gray-600 mb-1">
                                      <span className="font-medium">Click to upload</span> or drag and drop
                                    </p>
                                    <p className="text-xs text-gray-500 mb-2">MP4, MOV, AVI up to 10GB</p>
                                    <div className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                                      🚀 Mux
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          )}

                          <div className="flex items-center space-x-3">
                            {videoSource === 'mux' && (
                              <input
                                id="video-upload"
                                type="file"
                                accept="video/*"
                                onChange={handleVideoUpload}
                                className="hidden"
                                disabled={isVideoProcessing}
                              />)}
                            {videoSource === 'mux' && videoFile && (
                              <div className="text-sm text-gray-600 flex items-center flex-wrap gap-2">
                                <span>📹 {videoFile.name} ({videoFile.size >= 1024 * 1024 * 1024
                                  ? (videoFile.size / (1024 * 1024 * 1024)).toFixed(2) + 'GB'
                                  : Math.round(videoFile.size / (1024 * 1024)) + 'MB'
                                })</span>
                                {formData.duration_minutes > 0 && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    ⏱️ {formData.duration_minutes < 60 ? `${formData.duration_minutes} sec` : `${Math.floor(formData.duration_minutes / 60)}:${String(Math.floor(formData.duration_minutes % 60)).padStart(2, '0')}`} (Auto-detected)
                                  </span>
                                )}
                                {formData.mux_asset_id && (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                    ✓ Processed by Mux
                                  </span>
                                )}
                              </div>
                            )}
                            {videoSource === 'mux' && uploadState.error && (
                              <div className="text-sm text-red-600">
                                ❌ {uploadState.error}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Thumbnail Upload Section */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">
                        Class Thumbnail
                      </label>
                      <div className="space-y-3">
                        {thumbnailPreview ? (
                          <div className="relative w-full bg-gray-100 rounded-lg overflow-hidden shadow-md" style={{ aspectRatio: '16/9' }}>
                            <Image
                              src={thumbnailPreview}
                              alt="Class thumbnail preview"
                              width={400}
                              height={225}
                              className="w-full h-full object-cover"
                            />
                            <button
                              onClick={removeThumbnail}
                              className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors shadow-lg"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ) : (
                          <div
                            className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 shadow-sm"
                            style={{ aspectRatio: '16/9' }}
                            onDragOver={handleThumbnailDragOver}
                            onDrop={handleThumbnailDrop}
                            onClick={() => document.getElementById('thumbnailInput')?.click()}
                          >
                            <div className="mx-auto h-10 w-10 text-gray-400 mb-3">
                              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                              </svg>
                            </div>
                            <p className="text-sm font-semibold text-gray-700 mb-1">Upload Thumbnail</p>
                            <p className="text-xs text-gray-600 mb-1">Click or drag & drop your image here</p>
                            <p className="text-xs text-gray-500">JPG, PNG, GIF up to 5MB</p>
                            <input
                              id="thumbnailInput"
                              type="file"
                              accept="image/*"
                              onChange={handleThumbnailUpload}
                              className="hidden"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                  {/* Duration is auto-detected from video and saved automatically */}

                  <div className="flex items-center p-4 bg-gray-50 rounded-lg">
                    <input
                      type="checkbox"
                      id="is_free"
                      checked={Boolean(formData.is_free)}
                      onChange={(e) => handleInputChange('is_free', e.target.checked)}
                      className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                    />
                    <label htmlFor="is_free" className="ml-3 text-sm font-medium text-gray-700">
                      Free preview class
                    </label>
                  </div>

                  <div className="flex justify-end space-x-4 pt-4 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={cancelForm}
                      className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                      disabled={isVideoProcessing}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className={`px-6 py-3 text-white rounded-lg transition-colors font-medium flex items-center ${isVideoProcessing
                        ? 'bg-gray-400 cursor-not-allowed'
                        : 'bg-blue-600 hover:bg-blue-700 shadow-lg hover:shadow-xl'
                        }`}
                      disabled={isVideoProcessing}
                    >
                      {isVideoProcessing ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block mr-2"></div>
                          Processing...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          {editingClass ? 'Update Class' : 'Add Class'}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* Classes List */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Classes</h3>
            </div>

            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-2 text-gray-600">Loading classes...</p>
              </div>
            ) : classes.length === 0 ? (
              <div className="p-8 text-center text-gray-600">
                <svg className="w-12 h-12 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <p className="text-lg font-medium">No classes found</p>
                <p className="text-sm text-gray-500">Add your first class to get started</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {classes.map((classItem, index) => (
                  <div key={classItem.id} className="p-6 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center">
                          <span className="text-sm font-medium text-gray-500 mr-3">
                            {index + 1}.
                          </span>
                          {getVideoThumbnail(classItem) && (
                            <div className="w-16 h-12 rounded-lg overflow-hidden mr-4 flex-shrink-0 relative">
                              <Image
                                src={getVideoThumbnail(classItem)!}
                                alt={classItem.title}
                                width={64}
                                height={48}
                                className="w-full h-full object-cover"
                              />
                              {classItem.mux_playback_id && (
                                <div className="absolute bottom-0 right-0 bg-blue-600 text-white text-xs px-1 rounded-tl">
                                  Mux
                                </div>
                              )}
                            </div>
                          )}
                          <div>
                            <h4 className="text-lg font-medium text-gray-900">{classItem.title}</h4>
                            {classItem.description && (
                              <p className="text-sm text-gray-600 mt-1">{classItem.description}</p>
                            )}
                            <div className="flex items-center mt-2 space-x-4">
                              {classItem.duration_minutes > 0 && (
                                <span className="text-xs text-gray-500">
                                  {classItem.duration_minutes} minutes
                                </span>
                              )}
                              {classItem.mux_playback_id && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  🚀 Mux Video
                                </span>
                              )}
                              {classItem.is_free && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Free Preview
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEdit(classItem)}
                          className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(classItem.id)}
                          className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}