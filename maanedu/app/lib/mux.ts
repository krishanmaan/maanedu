import Mux from '@mux/mux-node';

// Initialize Mux client
const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
});

export interface MuxUploadResponse {
  id: string;
  url: string;
  status: string;
  playback_id?: string;
}

export interface MuxAsset {
  id: string;
  status: string;
  playback_ids?: Array<{
    id: string;
    policy: string;
  }>;
  duration?: number;
}

/**
 * Create a direct upload URL for video files
 * This allows users to upload videos directly to Mux
 */
export async function createDirectUpload(): Promise<{
  id: string;
  url: string;
}> {
  try {
    const upload = await mux.video.uploads.create({
      cors_origin: '*', // Allow uploads from any origin
      new_asset_settings: {
        playback_policy: ['public'],
        encoding_tier: 'baseline', // or 'smart' for better quality
      },
    });

    return {
      id: upload.id!,
      url: upload.url!,
    };
  } catch (error) {
    console.error('Error creating Mux direct upload:', error);
    throw new Error('Failed to create upload URL');
  }
}

/**
 * Get asset information from Mux
 */
export async function getMuxAsset(assetId: string): Promise<MuxAsset> {
  try {
    console.log('Mux API: Retrieving asset with ID:', assetId);
    
    if (!assetId || assetId.trim() === '') {
      throw new Error('Asset ID is required');
    }
    
    // Check if Mux client is properly initialized
    if (!process.env.MUX_TOKEN_ID || !process.env.MUX_TOKEN_SECRET) {
      throw new Error('Mux credentials not found in environment variables');
    }
    
    const asset = await mux.video.assets.retrieve(assetId);
    console.log('Mux API response:', {
      id: asset.id,
      status: asset.status,
      playback_ids_count: asset.playback_ids?.length || 0,
      duration: asset.duration
    });
    
    return {
      id: asset.id!,
      status: asset.status!,
      playback_ids: asset.playback_ids?.map(p => ({
        id: p.id!,
        policy: p.policy!,
      })),
      duration: asset.duration,
    };
  } catch (error) {
    console.error('Error retrieving Mux asset:', {
      assetId,
      error: error instanceof Error ? error.message : error,
      errorType: error?.constructor?.name,
      stack: error instanceof Error ? error.stack : undefined
    });
    
    // Provide more specific error messages
    if (error instanceof Error) {
      if (error.message.includes('404') || error.message.includes('not found')) {
        throw new Error(`Asset '${assetId}' not found in Mux. It may still be uploading or the upload failed.`);
      } else if (error.message.includes('401') || error.message.includes('unauthorized')) {
        throw new Error('Mux API authentication failed. Please check your credentials.');
      } else if (error.message.includes('403') || error.message.includes('forbidden')) {
        throw new Error('Mux API access denied. Please check your token permissions.');
      } else {
        throw new Error(`Mux API error: ${error.message}`);
      }
    }
    
    throw new Error('Failed to retrieve asset information');
  }
}

/**
 * Create an asset from a URL (alternative to direct upload)
 */
export async function createAssetFromUrl(videoUrl: string): Promise<{
  id: string;
  status: string;
}> {
  try {
    const asset = await mux.video.assets.create({
      inputs: [{ url: videoUrl }],
      playback_policy: ['public'],
      encoding_tier: 'baseline',
    });

    return {
      id: asset.id!,
      status: asset.status!,
    };
  } catch (error) {
    console.error('Error creating Mux asset from URL:', error);
    throw new Error('Failed to create asset from URL');
  }
}

/**
 * Get playback URL for a Mux asset
 */
export function getPlaybackUrl(playbackId: string): string {
  return `https://stream.mux.com/${playbackId}.m3u8`;
}

/**
 * Get thumbnail URL for a Mux asset
 */
export function getThumbnailUrl(playbackId: string, options?: {
  width?: number;
  height?: number;
  fit_mode?: 'preserve' | 'crop' | 'pad';
  time?: number;
}): string {
  const params = new URLSearchParams();
  
  if (options?.width) params.set('width', options.width.toString());
  if (options?.height) params.set('height', options.height.toString());
  if (options?.fit_mode) params.set('fit_mode', options.fit_mode);
  if (options?.time) params.set('time', options.time.toString());

  const queryString = params.toString();
  return `https://image.mux.com/${playbackId}/thumbnail.jpg${queryString ? '?' + queryString : ''}`;
}

export { mux };

// Create a Mux Live Stream and return RTMP and playback details
export async function createLiveStream(): Promise<{
  id: string;
  stream_key: string;
  rtmp_url: string;
  playback_id?: string;
}> {
  try {
    const live = await mux.video.liveStreams.create({
      playback_policy: ['public'],
      new_asset_settings: { playback_policy: ['public'] },
      test: true,
    });

    const playbackId = live.playback_ids && live.playback_ids[0]?.id;

    return {
      id: live.id!,
      stream_key: live.stream_key!,
      // Mux global RTMPS ingest. OBS supports both rtmp and rtmps.
      rtmp_url: 'rtmps://global-live.mux.com:443/app',
      playback_id: playbackId,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error creating Mux live stream:', message, error);
    throw new Error(`Mux live stream create failed: ${message}`);
  }
}