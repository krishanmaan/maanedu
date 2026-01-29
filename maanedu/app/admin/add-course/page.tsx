'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useMux } from '@/hooks/useMux';
import { useSupabase } from '@/contexts/AuthContext';

export default function AddCourse() {
  // Get user-specific Supabase client
  const supabase = useSupabase();

  const [currentStep, setCurrentStep] = useState(1);
  const progressPercent = Math.round((currentStep / 4) * 100);
  const [courseData, setCourseData] = useState({
    title: '',
    price: '',
    description: '',
    featured: false,
    category: '',
    validity: 'months',
    validityValue: '6',
    validityType: 'set_validity', // 'set_validity', 'end_date', 'lifetime'
    endDate: '',
    coverImage: null as File | null,
    demoVideo: null as File | null,
    // Pricing step
    mrp: '',
    discountCodes: '' as string,
    easyEmi: false,
    isCombo: false,
    intlPriceUptick: false,
    // Content step
    attachedTestSeriesSearch: '',
    attachedBookId: '',
    // Additional Settings
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

  // Rich text editor state (variables removed as they're not used in the current implementation)

  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
  const [demoVideoPreview, setDemoVideoPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [videoProcessingStatus, setVideoProcessingStatus] = useState<string>('');
  const [isVideoProcessing, setIsVideoProcessing] = useState(false);
  const [muxPlaybackId, setMuxPlaybackId] = useState<string | null>(null);
  const [muxAssetId, setMuxAssetId] = useState<string | null>(null);

  const { uploadVideo, pollAssetStatus, uploadState, resetUploadState } = useMux();

  const steps = [
    { id: 1, title: 'Basic Course Information' },
    { id: 2, title: 'Pricing' },
    { id: 3, title: 'Content' },
    { id: 4, title: 'Additional Settings' }
  ];

  const handleInputChange = (field: string, value: string | boolean | File | null) => {
    setCourseData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleNext = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handlePublish = async () => {
    if (!courseData.title || !courseData.price || !courseData.description) {
      setMessage({ type: 'error', text: 'Please fill in all required fields (Title, Price, Description)' });
      return;
    }

    if (!supabase) {
      setMessage({ type: 'error', text: 'Database connection not available. Please try logging in again.' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      // Assemble extended settings JSON with all optional fields from the wizard
      const settings = {
        pricing: {
          mrp: courseData.mrp || '',
          discountCodes: courseData.discountCodes || '',
          easyEmi: Boolean(courseData.easyEmi),
          isCombo: Boolean(courseData.isCombo),
          intlPriceUptick: Boolean(courseData.intlPriceUptick)
        },
        content: {
          attachedTestSeriesSearch: courseData.attachedTestSeriesSearch || '',
          attachedBookId: courseData.attachedBookId || ''
        },
        validity: {
          type: courseData.validityType,
          unit: courseData.validity,
          value: courseData.validityValue,
          endDate: courseData.endDate
        },
        additional: {
          sortingOrder: courseData.sortingOrder || '',
          chooseTabs: Boolean(courseData.chooseTabs),
          markAsNewBatch: Boolean(courseData.markAsNewBatch),
          disableInvoice: Boolean(courseData.disableInvoice),
          enableTelegram: Boolean(courseData.enableTelegram),
          metaTitle: courseData.metaTitle || '',
          metaDescription: courseData.metaDescription || '',
          richSnippets: Boolean(courseData.richSnippets),
          featureOnWebsite: courseData.featureOnWebsite,
          language: courseData.language
        }
      };

      // Resolve Mux playback information (mirror classes save behavior)
      let effectiveMuxPlaybackId: string | null = muxPlaybackId;
      let effectiveVideoUrl: string | null = null;

      // If playback ID not ready but we have an asset ID, try to fetch it from Mux API
      if (!effectiveMuxPlaybackId && muxAssetId) {
        try {
          const res = await fetch(`/api/mux/asset/${muxAssetId}`);
          const data = await res.json();
          const fetchedPlaybackId = data?.asset?.playback_ids?.[0]?.id as string | undefined;
          if (fetchedPlaybackId) {
            effectiveMuxPlaybackId = fetchedPlaybackId;
          }
        } catch (e) {
          // Non-blocking: we can still save with asset-based URL; playback may appear later
          console.warn('Could not retrieve playback ID before publish; proceeding with asset ID.', e);
        }
      }

      // Prefer mux://playbackId (same as classes); fallback to mux://assetId; else null
      if (effectiveMuxPlaybackId) {
        effectiveVideoUrl = `mux://${effectiveMuxPlaybackId}`;
      } else if (muxAssetId) {
        effectiveVideoUrl = `mux://${muxAssetId}`;
      } else {
        effectiveVideoUrl = null;
      }

      // Prepare base course data for Supabase (only existing columns from schema)
      const baseCourseData = {
        title: courseData.title,
        description: courseData.description,
        category: courseData.category || 'Uncategorized',
        price: parseFloat(courseData.price),
        image_url: coverImagePreview || null,
        // Video fields (expected to exist in schema)
        video_url: effectiveVideoUrl,
        mux_asset_id: muxAssetId || null,
        mux_playback_id: effectiveMuxPlaybackId || null
      } as Record<string, unknown>;

      // Prefer saving extended settings into a JSON column named `settings` if present
      const extendedCourseData = { ...baseCourseData, settings };

      // Attempt insert with `settings`; if it fails due to unknown column, retry with base data only
      let insertError: unknown = null;
      try {
      const { error } = await supabase
        .from('courses')
          .insert([extendedCourseData])
        .select();
        if (error) throw error;
      } catch (err) {
        insertError = err;
        // First fallback: try without settings but keep video fields
        const { error: fallbackError1 } = await supabase
          .from('courses')
          .insert([baseCourseData])
          .select();
        if (fallbackError1) {
          // Second fallback: strip potential unknown video columns
          const baseMinimal = {
            title: baseCourseData.title,
            description: baseCourseData.description,
            category: baseCourseData.category,
            price: baseCourseData.price,
            image_url: baseCourseData.image_url
          } as Record<string, unknown>;
          const { error: fallbackError2 } = await supabase
            .from('courses')
            .insert([baseMinimal])
            .select();
          if (fallbackError2) throw fallbackError2;
        }
      }

      // If we had to fallback (e.g., settings or video columns missing), ensure video columns are updated when present
      try {
        await supabase
          .from('courses')
          .update({
            video_url: baseCourseData.video_url ?? null,
            mux_asset_id: baseCourseData.mux_asset_id ?? null,
            mux_playback_id: baseCourseData.mux_playback_id ?? null
          })
          .eq('title', baseCourseData.title as string)
          .eq('description', baseCourseData.description as string)
          .order('created_at', { ascending: false })
          .limit(1);
      } catch (e) {
        console.warn('Post-insert video field update skipped/failed (non-blocking):', e);
      }

      setMessage({ type: 'success', text: 'Course published successfully! Redirecting to admin dashboard...' });
      
             // Reset form
      setCourseData({
        title: '',
        price: '',
        description: '',
        featured: false,
        category: '',
        validity: 'months',
        validityValue: '6',
        validityType: 'set_validity',
        endDate: '',
        coverImage: null,
        demoVideo: null,
        mrp: '',
        discountCodes: '',
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
      setCoverImagePreview(null);
      setDemoVideoPreview(null);
      setMuxPlaybackId(null);
      setMuxAssetId(null);
      resetUploadState();

      // Redirect to admin dashboard after 2 seconds
      setTimeout(() => {
        window.location.href = '/admin';
      }, 2000);

    } catch (error: unknown) {
      console.error('Error publishing course:', error);
      setMessage({ type: 'error', text: `Error publishing course: ${error instanceof Error ? error.message : 'Unknown error'}` });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (type === 'image') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        setCoverImagePreview(result);
        setCourseData(prev => ({ ...prev, coverImage: file }));
      };
      reader.readAsDataURL(file);
      return;
    }

    // Video via Mux
    if (!file.type.startsWith('video/')) {
      setMessage({ type: 'error', text: 'Please select a valid video file' });
      return;
    }

    const localUrl = URL.createObjectURL(file);
    setDemoVideoPreview(localUrl);

    try {
      setIsVideoProcessing(true);
      setVideoProcessingStatus('Uploading to Mux...');
      const { assetId } = await uploadVideo(file);
      setMuxAssetId(assetId);
      setVideoProcessingStatus('Processing video...');

      const asset = await pollAssetStatus(assetId, (status) => {
        setVideoProcessingStatus(`Processing: ${status}`);
      });

      const playbackId = asset.playback_ids?.[0]?.id;
      if (playbackId) {
        setMuxPlaybackId(playbackId);
        setMessage({ type: 'success', text: 'Demo video uploaded and processed via Mux' });
        setVideoProcessingStatus('Ready!');
      } else {
        setMessage({ type: 'success', text: 'Video uploaded. Processing may take a few more minutes.' });
        setVideoProcessingStatus('Processing in background...');
      }
    } catch (err) {
      console.error('Mux upload error:', err);
      setMessage({ type: 'error', text: 'Failed to upload demo video to Mux' });
      setMuxAssetId(null);
      setMuxPlaybackId(null);
      setDemoVideoPreview(null);
    } finally {
      setIsVideoProcessing(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, type: 'image' | 'video') => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const inputEvent = { target: { files: [file] } } as unknown as React.ChangeEvent<HTMLInputElement>;
    await handleFileUpload(inputEvent, type);
  };

  // Rich text editor functions
  const handleFormat = (format: string) => {
    const textarea = document.getElementById('descriptionTextarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);
    const beforeText = textarea.value.substring(0, start);
    const afterText = textarea.value.substring(end);

    let formattedText = selectedText;
    let newCursorPos = start;

    switch (format) {
      case 'bold':
        formattedText = `**${selectedText}**`;
        newCursorPos = start + 2;
        break;
      case 'italic':
        formattedText = `*${selectedText}*`;
        newCursorPos = start + 1;
        break;
      case 'underline':
        formattedText = `__${selectedText}__`;
        newCursorPos = start + 2;
        break;
      case 'strikethrough':
        formattedText = `~~${selectedText}~~`;
        newCursorPos = start + 2;
        break;
      case 'subscript':
        formattedText = `<sub>${selectedText}</sub>`;
        newCursorPos = start + 5;
        break;
      case 'superscript':
        formattedText = `<sup>${selectedText}</sup>`;
        newCursorPos = start + 5;
        break;
    }

    const newValue = beforeText + formattedText + afterText;
    handleInputChange('description', newValue);

    // Restore cursor position
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos + selectedText.length);
    }, 0);
  };

  const insertSpecialChar = (char: string) => {
    const textarea = document.getElementById('descriptionTextarea') as HTMLTextAreaElement;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const beforeText = textarea.value.substring(0, start);
    const afterText = textarea.value.substring(start);
    const newValue = beforeText + char + afterText;
    
    handleInputChange('description', newValue);
    
    // Set cursor position after inserted character
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + char.length, start + char.length);
    }, 0);
  };

  // Show loading state if Supabase client is not ready
  if (!supabase) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black mx-auto mb-4"></div>
          <p className="text-gray-600">Loading database connection...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <h1 className="text-lg sm:text-xl font-semibold text-gray-900">Add New Course</h1>
          <div className="flex items-center space-x-2 sm:space-x-3">
            <button 
              onClick={() => window.location.href = '/admin'}
              className="px-3 py-2 text-gray-600 hover:text-gray-900 transition-colors flex items-center rounded-md hover:bg-gray-50"
            >
              <span className="mr-1">X</span>
              Close
            </button>
            <button 
              onClick={handlePublish}
              disabled={isLoading}
              className={`px-4 sm:px-6 py-2 rounded-md transition-colors flex items-center ${isLoading
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-black hover:bg-gray-800'
              } text-white`}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Publishing...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Publish
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Message Display */}
      {message && (
        <div className={`px-6 py-4 ${message.type === 'success'
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

      {/* Step Navigation */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-3">
        <div className="flex space-x-4 sm:space-x-8 overflow-x-auto no-scrollbar">
          {steps.map((step) => (
            <button
              key={step.id}
              onClick={() => setCurrentStep(step.id)}
              className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap transition-colors ${currentStep === step.id
                  ? 'border-black text-black'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className={`w-6 h-6 rounded-full text-xs flex items-center justify-center ${currentStep === step.id
                  ? 'bg-black text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {step.id}
              </span>
              <span>{step.title}</span>
            </button>
          ))}
        </div>
        <div className="mt-3 h-1.5 w-full bg-gray-100 rounded-full">
          <div className="h-1.5 bg-black rounded-full transition-all" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      <div className="flex gap-0">
        {/* Main Content */}
        <div className="flex-1 pt-2 ">
          <div className="max-w-3xl sm:max-w-4xl mx-auto">
            {currentStep === 1 && (
              <div className="space-y-8">
                {/* Title & Price Section */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">Title & Price</h2>
                      <p className="text-sm text-gray-500 mt-1">Set the basic details students will see first.</p>
                    </div>
                    <div className="hidden sm:flex items-center gap-2">
                      <span className="text-xs text-gray-500">Featured</span>
                      <button
                        onClick={() => handleInputChange('featured', !courseData.featured)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${courseData.featured ? 'bg-blue-600' : 'bg-gray-200'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${courseData.featured ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    {/* Title */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Title*
                      </label>
                      <div className="relative">
                                                 <input
                           type="text"
                           value={courseData.title}
                           onChange={(e) => handleInputChange('title', e.target.value)}
                           placeholder="Course Name"
                           className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 placeholder-gray-500"
                         />
                        <svg className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                    </div>

                    {/* Price */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Price*
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                                                 <input
                           type="number"
                           value={courseData.price}
                           onChange={(e) => handleInputChange('price', e.target.value)}
                           placeholder="Enter Price"
                           className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 placeholder-gray-500"
                         />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Course Description */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-6">Course Description</h2>
                  
                  

                  {/* Text Editor */}
                  <textarea
                    id="descriptionTextarea"
                    value={courseData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    placeholder="Write your course description here... Use the toolbar above to format your text."
                    className="w-full h-64 p-4 border border-gray-300 rounded-b-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-gray-800 placeholder-gray-500"
                  />
                </div>

                {/* Media Uploads */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-6">Media Uploads</h2>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Cover Image Section */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">Cover Image</label>
                      <div className="space-y-3">
                        {coverImagePreview ? (
                          <div className="relative w-full bg-gray-100 rounded-lg overflow-hidden shadow-md" style={{ aspectRatio: '16/9' }}>
                            <Image 
                              src={coverImagePreview} 
                              alt="Cover preview" 
                              width={400}
                              height={225}
                              className="w-full h-full object-cover"
                            />
                            <button
                              onClick={() => {
                                setCoverImagePreview(null);
                                setCourseData(prev => ({ ...prev, coverImage: null }));
                              }}
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
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, 'image')}
                            onClick={() => document.getElementById('coverImageInput')?.click()}
                          >
                            <div className="mx-auto h-10 w-10 text-gray-400 mb-3">
                              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                              </svg>
                            </div>
                            <p className="text-sm font-semibold text-gray-700 mb-1">Upload Image</p>
                            <p className="text-xs text-gray-600 mb-1">Click or drag & drop your image here</p>
                            <p className="text-xs text-gray-500">JPG, PNG, GIF up to 5MB</p>
                            <input
                              id="coverImageInput"
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleFileUpload(e, 'image')}
                              className="hidden"
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Demo Video Section */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-3">Demo Video</label>
                      <div className="space-y-3">
                        {demoVideoPreview ? (
                          <div className="relative w-full bg-black rounded-lg overflow-hidden shadow-md" style={{ aspectRatio: '16/9' }}>
                            <video 
                              src={demoVideoPreview} 
                              controls
                              className="w-full h-full object-contain"
                              preload="metadata"
                            />
                            <button
                              onClick={() => {
                                setDemoVideoPreview(null);
                                setCourseData(prev => ({ ...prev, demoVideo: null }));
                                setMuxPlaybackId(null);
                                setMuxAssetId(null);
                                resetUploadState();
                              }}
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
                            className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 shadow-sm"
                            style={{ aspectRatio: '16/9' }}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, 'video')}
                            onClick={() => document.getElementById('demoVideoInput')?.click()}
                          >
                            <div className="mx-auto h-10 w-10 text-gray-400 mb-3">
                              <svg stroke="currentColor" fill="none" viewBox="0 0 48 48" className="w-full h-full">
                                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            </div>
                            <p className="text-sm font-semibold text-gray-700 mb-1">Upload Video</p>
                            <p className="text-xs text-gray-600 mb-1">Click or drag & drop your video here</p>
                            <p className="text-xs text-gray-500">MP4, MOV, AVI up to 10GB</p>
                            <div className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                              🚀 Mux
                            </div>
                            <input
                              id="demoVideoInput"
                              type="file"
                              accept="video/*"
                              onChange={(e) => handleFileUpload(e, 'video')}
                              className="hidden"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Categories */}
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-6">Categories</h2>
                                     <input
                     type="text"
                     value={courseData.category}
                     onChange={(e) => handleInputChange('category', e.target.value)}
                     placeholder="Select Categories"
                     className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 placeholder-gray-500"
                   />
                </div>

                                 {/* Validity */}
                 <div className="bg-white rounded-lg border border-gray-200 p-6">
                   <h2 className="text-lg font-semibold text-gray-900 mb-6">Course Validity</h2>
                   
                   {/* Validity Type Selection */}
                   <div className="mb-6">
                     <label className="block text-sm font-medium text-gray-700 mb-3">Validity Type</label>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                       <button
                         onClick={() => handleInputChange('validityType', 'set_validity')}
                        className={`p-4 border-2 rounded-lg text-left transition-all ${courseData.validityType === 'set_validity'
                             ? 'border-blue-500 bg-blue-50 text-blue-700'
                             : 'border-gray-200 hover:border-gray-300 text-gray-700'
                         }`}
                       >
                         <div className="flex items-center mb-2">
                          <div className={`w-4 h-4 rounded-full border-2 mr-3 ${courseData.validityType === 'set_validity'
                               ? 'border-blue-500 bg-blue-500'
                               : 'border-gray-300'
                           }`}>
                             {courseData.validityType === 'set_validity' && (
                               <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                             )}
                           </div>
                           <span className="font-medium">Set Duration</span>
                         </div>
                       </button>

                       <button
                         onClick={() => handleInputChange('validityType', 'end_date')}
                        className={`p-4 border-2 rounded-lg text-left transition-all ${courseData.validityType === 'end_date'
                             ? 'border-blue-500 bg-blue-50 text-blue-700'
                             : 'border-gray-200 hover:border-gray-300 text-gray-700'
                         }`}
                       >
                         <div className="flex items-center mb-2">
                          <div className={`w-4 h-4 rounded-full border-2 mr-3 ${courseData.validityType === 'end_date'
                               ? 'border-blue-500 bg-blue-500'
                               : 'border-gray-300'
                           }`}>
                             {courseData.validityType === 'end_date' && (
                               <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                             )}
                           </div>
                           <span className="font-medium">End Date</span>
                         </div>
                       </button>

                       <button
                         onClick={() => handleInputChange('validityType', 'lifetime')}
                        className={`p-4 border-2 rounded-lg text-left transition-all ${courseData.validityType === 'lifetime'
                             ? 'border-blue-500 bg-blue-50 text-blue-700'
                             : 'border-gray-200 hover:border-gray-300 text-gray-700'
                         }`}
                       >
                         <div className="flex items-center mb-2">
                          <div className={`w-4 h-4 rounded-full border-2 mr-3 ${courseData.validityType === 'lifetime'
                               ? 'border-blue-500 bg-blue-500'
                               : 'border-gray-300'
                           }`}>
                             {courseData.validityType === 'lifetime' && (
                               <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                             )}
                           </div>
                           <span className="font-medium">Lifetime Access</span>
                         </div>
                       </button>
                     </div>
                   </div>

                   {/* Validity Settings Based on Type */}
                   {courseData.validityType === 'set_validity' && (
                     <div className="bg-gray-50 p-4 rounded-lg">
                       <label className="block text-sm font-medium text-gray-700 mb-3">Duration Settings</label>
                       <div className="flex flex-col sm:flex-row gap-3">
                         <div className="flex-1">
                           <label className="block text-xs font-medium text-gray-600 mb-1">Duration</label>
                           <select
                             value={courseData.validity}
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
                             value={courseData.validityValue}
                             onChange={(e) => handleInputChange('validityValue', e.target.value)}
                             className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 text-sm"
                             min="1"
                             max="999"
                             placeholder="Enter number"
                           />
                         </div>
                       </div>
                       <p className="text-xs text-gray-500 mt-2">
                         Students will have access for {courseData.validityValue} {courseData.validity} from enrollment
                       </p>
                     </div>
                   )}

                   {courseData.validityType === 'end_date' && (
                     <div className="bg-gray-50 p-4 rounded-lg">
                       <label className="block text-sm font-medium text-gray-700 mb-3">End Date Settings</label>
                       <div className="flex flex-col sm:flex-row gap-3">
                         <div className="flex-1">
                           <label className="block text-xs font-medium text-gray-600 mb-1">End Date</label>
                           <input
                             type="date"
                             value={courseData.endDate}
                             onChange={(e) => handleInputChange('endDate', e.target.value)}
                             className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 text-sm"
                             min={new Date().toISOString().split('T')[0]}
                           />
                         </div>
                       </div>
                       <p className="text-xs text-gray-500 mt-2">
                         Students will have access until {courseData.endDate || 'selected date'}
                       </p>
                     </div>
                   )}

                   {courseData.validityType === 'lifetime' && (
                     <div className="bg-gray-50 p-4 rounded-lg">
                       <div className="flex items-center">
                         <svg className="w-5 h-5 text-green-500 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                         </svg>
                         <span className="text-sm font-medium text-gray-700">Lifetime Access Enabled</span>
                       </div>
                       <p className="text-xs text-gray-500 mt-2">
                         Students will have unlimited access to this course
                       </p>
                     </div>
                   )}
                 </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Pricing</h2>
                <div className="space-y-6">
                  {/* MRP */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">MRP</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                      <input
                        type="number"
                        value={courseData.mrp}
                        onChange={(e) => handleInputChange('mrp', e.target.value)}
                        placeholder="Display the maximum price"
                        className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 placeholder-gray-500"
                      />
                    </div>
                  </div>

                  {/* Discount Codes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Discount Codes</label>
                    <input
                      type="text"
                      value={courseData.discountCodes}
                      onChange={(e) => handleInputChange('discountCodes', e.target.value)}
                      placeholder="Type to search coupon codes"
                      className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 placeholder-gray-500"
                    />
                  </div>

                  {/* Toggles */}
                  <div className="space-y-4">
                    <div className="flex items-start justify-between p-4 border rounded-md">
                      <div>
                        <div className="text-sm font-medium text-gray-800">Easy EMI</div>
                      </div>
                      <button
                        onClick={() => handleInputChange('easyEmi', !courseData.easyEmi)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${courseData.easyEmi ? 'bg-blue-600' : 'bg-gray-200'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${courseData.easyEmi ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>

                    <div className="flex items-start justify-between p-4 border rounded-md">
                      <div>
                        <div className="text-sm font-medium text-gray-800">Make this a combo</div>
                      </div>
                      <button
                        onClick={() => handleInputChange('isCombo', !courseData.isCombo)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${courseData.isCombo ? 'bg-blue-600' : 'bg-gray-200'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${courseData.isCombo ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>

                    <div className="flex items-start justify-between p-4 border rounded-md">
                      <div>
                        <div className="text-sm font-medium text-gray-800">International Price Uptick</div>
                      </div>
                      <button
                        onClick={() => handleInputChange('intlPriceUptick', !courseData.intlPriceUptick)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${courseData.intlPriceUptick ? 'bg-blue-600' : 'bg-gray-200'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${courseData.intlPriceUptick ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Content</h2>
                <div className="space-y-6">
                  {/* Attach Test Series */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Attach Test Series</label>
                    <input
                      type="text"
                      value={courseData.attachedTestSeriesSearch}
                      onChange={(e) => handleInputChange('attachedTestSeriesSearch', e.target.value)}
                      placeholder="Search"
                      className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 placeholder-gray-500"
                    />
                  </div>

                  {/* Attach Book */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Attach Book</label>
                    <select
                      value={courseData.attachedBookId}
                      onChange={(e) => handleInputChange('attachedBookId', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                    >
                      <option value="">Select Book</option>
                      <option value="sample">Sample Book</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-6">Additional Settings</h2>
                <div className="space-y-6">
                  {/* Sorting order */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Sorting Order</label>
                    <input
                      type="number"
                      value={courseData.sortingOrder}
                      onChange={(e) => handleInputChange('sortingOrder', e.target.value)}
                      placeholder="0.00"
                      className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                    />
                  </div>

                  {/* Toggles list */}
                  <div className="space-y-4">
                    <div className="flex items-start justify-between p-4 border rounded-md">
                      <div>
                        <div className="text-sm font-medium text-gray-800">Choose Tabs to Show on Course Page</div>
                      </div>
                      <button
                        onClick={() => handleInputChange('chooseTabs', !courseData.chooseTabs)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${courseData.chooseTabs ? 'bg-blue-600' : 'bg-gray-200'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${courseData.chooseTabs ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>

                    <div className="flex items-start justify-between p-4 border rounded-md">
                      <div>
                        <div className="text-sm font-medium text-gray-800">Mark As New Batch</div>
                      </div>
                      <button
                        onClick={() => handleInputChange('markAsNewBatch', !courseData.markAsNewBatch)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${courseData.markAsNewBatch ? 'bg-blue-600' : 'bg-gray-200'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${courseData.markAsNewBatch ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>

                    <div className="flex items-start justify-between p-4 border rounded-md">
                      <div>
                        <div className="text-sm font-medium text-gray-800">Disable Invoice</div>
                      </div>
                      <button
                        onClick={() => handleInputChange('disableInvoice', !courseData.disableInvoice)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${courseData.disableInvoice ? 'bg-blue-600' : 'bg-gray-200'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${courseData.disableInvoice ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>

                    <div className="flex items-start justify-between p-4 border rounded-md">
                      <div>
                        <div className="text-sm font-medium text-gray-800">Enable Telegram Integration</div>
                      </div>
                      <button
                        onClick={() => handleInputChange('enableTelegram', !courseData.enableTelegram)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${courseData.enableTelegram ? 'bg-blue-600' : 'bg-gray-200'}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${courseData.enableTelegram ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                    </div>
                  </div>

                  {/* SEO Settings */}
                  <div className="border-t pt-6">
                    <h3 className="text-md font-semibold text-gray-900 mb-4">SEO Settings</h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Meta Title</label>
                        <input
                          type="text"
                          value={courseData.metaTitle}
                          onChange={(e) => handleInputChange('metaTitle', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                          placeholder="Enter Meta Title"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Meta Description</label>
                        <input
                          type="text"
                          value={courseData.metaDescription}
                          onChange={(e) => handleInputChange('metaDescription', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
                          placeholder="Enter Meta Description"
                        />
                      </div>

                      <div className="flex items-center justify-between p-4 border rounded-md">
                        <div className="text-sm font-medium text-gray-800">Enable Rich Snippets</div>
                        <button
                          onClick={() => handleInputChange('richSnippets', !courseData.richSnippets)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${courseData.richSnippets ? 'bg-blue-600' : 'bg-gray-200'}`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${courseData.richSnippets ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Feature and Language */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Feature on Website</label>
                      <select
                        value={courseData.featureOnWebsite}
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
                        value={courseData.language}
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
            )}

            {/* Navigation Buttons */}
            <div className="hidden sm:flex justify-end mt-8">
              {currentStep > 1 && (
                <button
                  onClick={handlePrevious}
                  className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors mr-3"
                >
                  Previous
                </button>
              )}
              {currentStep < 4 && (
                <button
                  onClick={handleNext}
                  className="px-6 py-2 bg-black text-white rounded-md hover:bg-gray-800 transition-colors"
                >
                  Next →
                </button>
              )}
            </div>

            {/* Sticky bottom bar for mobile */}
            <div className="sm:hidden fixed inset-x-0 bottom-0 bg-white border-t border-gray-200 px-4 py-3 flex items-center justify-between z-30">
              <div className="text-xs text-gray-500">Step {currentStep} of 4</div>
              <div className="flex items-center gap-2">
                {currentStep > 1 && (
                  <button
                    onClick={handlePrevious}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md"
                  >
                    Previous
                  </button>
                )}
                {currentStep < 4 && (
                  <button
                    onClick={handleNext}
                    className="px-4 py-2 bg-black text-white rounded-md"
                  >
                    Next
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Preview removed as requested */}
      </div>
    </div>
  );
}
