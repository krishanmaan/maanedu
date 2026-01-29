import { useState, useCallback } from 'react';

export interface MuxUploadState {
  isUploading: boolean;
  uploadProgress: number;
  uploadId: string | null;
  assetId: string | null;
  playbackId: string | null;
  error: string | null;
}

export interface MuxAssetInfo {
  id: string;
  status: string;
  playback_ids?: Array<{
    id: string;
    policy: string;
  }>;
  duration?: number;
}

export function useMux() {
  const [uploadState, setUploadState] = useState<MuxUploadState>({
    isUploading: false,
    uploadProgress: 0,
    uploadId: null,
    assetId: null,
    playbackId: null,
    error: null,
  });

  const createUploadUrl = useCallback(async (): Promise<{
    uploadId: string;
    uploadUrl: string;
  }> => {
    try {
      console.log('Requesting Mux upload URL...');
      
      const response = await fetch('/api/mux/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('Upload URL response status:', response.status);
      
      const data = await response.json();
      console.log('Upload URL response data:', data);

      if (!data.success) {
        throw new Error(data.error || 'Failed to create upload URL');
      }

      return {
        uploadId: data.upload_id,
        uploadUrl: data.upload_url,
      };
    } catch (error) {
      console.error('Error creating upload URL:', error);
      throw error;
    }
  }, []);

  const uploadVideo = useCallback(async (file: File): Promise<{
    uploadId: string;
    assetId: string;
  }> => {
    setUploadState(prev => ({
      ...prev,
      isUploading: true,
      uploadProgress: 0,
      error: null,
    }));

    try {
      // Step 1: Get upload URL
      const { uploadId, uploadUrl } = await createUploadUrl();
      
      setUploadState(prev => ({
        ...prev,
        uploadId,
        uploadProgress: 10,
      }));

      // Step 2: Upload file to Mux
      console.log('Uploading file to Mux URL:', uploadUrl.substring(0, 50) + '...');
      
      const uploadResponse = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type,
        },
      });

      console.log('Upload response status:', uploadResponse.status);
      console.log('Upload response headers:', Object.fromEntries(uploadResponse.headers.entries()));

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('Upload failed:', errorText);
        throw new Error(`Upload failed (${uploadResponse.status}): ${errorText}`);
      }

      setUploadState(prev => ({
        ...prev,
        uploadProgress: 90,
      }));

      // Step 3: Resolve uploadId -> assetId (upload becomes asset later)
      let assetId = uploadId;
      try {
        const r = await fetch(`/api/mux/upload/${uploadId}`);
        const j = await r.json();
        const linkedAssetId = j?.upload?.asset_id as string | undefined;
        if (linkedAssetId) assetId = linkedAssetId;
      } catch (e) {
        console.warn('Could not resolve asset_id from upload immediately, will poll.', e);
      }

      console.log('Upload completed, asset ID (resolved):', assetId);

      setUploadState(prev => ({
        ...prev,
        assetId,
        uploadProgress: 100,
        isUploading: false,
      }));

      return { uploadId, assetId };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      setUploadState(prev => ({
        ...prev,
        isUploading: false,
        error: errorMessage,
      }));
      throw error;
    }
  }, [createUploadUrl]);

  const getAssetInfo = useCallback(async (id: string): Promise<MuxAssetInfo> => {
    try {
      console.log('Getting asset info for:', id);
      
      if (!id || id.trim() === '') {
        throw new Error('Invalid ID provided');
      }

      // If caller passed an uploadId, convert to assetId first
      let assetId = id;
      if (id.startsWith('upl_')) {
        const r = await fetch(`/api/mux/upload/${id}`);
        const j = await r.json();
        const linked = j?.upload?.asset_id as string | undefined;
        if (linked) assetId = linked;
      }
      
      const response = await fetch(`/api/mux/asset/${assetId}`);
      console.log('Asset info response status:', response.status);
      console.log('Asset info response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('HTTP error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      console.log('Asset info response data:', data);

      if (!data.success) {
        console.error('API returned failure:', data);
        throw new Error(data.error || 'Failed to get asset info');
      }

      if (!data.asset) {
        throw new Error('No asset data returned from API');
      }

      return data.asset;
    } catch (error) {
      console.error('Error getting asset info:', {
        assetId: id,
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined
      });
      throw error;
    }
  }, []);

  const pollAssetStatus = useCallback(async (
    assetId: string,
    onStatusUpdate?: (status: string, asset?: MuxAssetInfo) => void
  ): Promise<MuxAssetInfo> => {
    return new Promise((resolve, reject) => {
      console.log('Starting to poll asset status for:', assetId);
      let pollCount = 0;
      const maxPolls = 150; // 5 minutes at 2-second intervals
      
      const pollInterval = setInterval(async () => {
        try {
          pollCount++;
          console.log(`Poll attempt ${pollCount}/${maxPolls} for asset:`, assetId);
          
          const asset = await getAssetInfo(assetId);
          console.log('Asset status:', asset.status, 'Poll count:', pollCount);
          
          onStatusUpdate?.(asset.status, asset);

          if (asset.status === 'ready') {
            console.log('Asset ready! Playback IDs:', asset.playback_ids);
            clearInterval(pollInterval);
            
            // Update state with playback ID
            if (asset.playback_ids && asset.playback_ids.length > 0) {
              setUploadState(prev => ({
                ...prev,
                playbackId: asset.playback_ids![0].id,
              }));
            }
            
            resolve(asset);
          } else if (asset.status === 'errored') {
            console.error('Asset processing failed');
            clearInterval(pollInterval);
            reject(new Error('Video processing failed'));
          } else if (pollCount >= maxPolls) {
            console.error('Polling timeout reached');
            clearInterval(pollInterval);
            reject(new Error('Asset processing timeout - please check Mux dashboard'));
          }
          // Continue polling for 'preparing' status
        } catch (error) {
          console.error(`Poll attempt ${pollCount} failed:`, error);
          clearInterval(pollInterval);
          
          // Provide more specific error message
          if (error instanceof Error) {
            if (error.message.includes('404')) {
              reject(new Error('Asset not found in Mux. Upload may have failed.'));
            } else if (error.message.includes('credentials')) {
              reject(new Error('Mux credentials invalid. Please check your .env.local file.'));
            } else {
              reject(new Error(`Asset retrieval failed: ${error.message}`));
            }
          } else {
            reject(new Error('Unknown error while retrieving asset information'));
          }
        }
      }, 2000); // Poll every 2 seconds
    });
  }, [getAssetInfo]);

  const resetUploadState = useCallback(() => {
    setUploadState({
      isUploading: false,
      uploadProgress: 0,
      uploadId: null,
      assetId: null,
      playbackId: null,
      error: null,
    });
  }, []);

  return {
    uploadState,
    uploadVideo,
    getAssetInfo,
    pollAssetStatus,
    resetUploadState,
  };
}
