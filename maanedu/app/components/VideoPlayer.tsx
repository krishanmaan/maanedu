'use client';

import MuxPlayer from '@mux/mux-player-react';

interface VideoPlayerProps {
  videoUrl?: string;
  muxPlaybackId?: string;
  title?: string;
  className?: string;
  controls?: boolean;
  autoPlay?: boolean;
  muted?: boolean;
}

export default function VideoPlayer({
  videoUrl,
  muxPlaybackId,
  title = 'Video',
  className = 'w-full h-full',
  controls = true,
  autoPlay = false,
  muted = false,
}: VideoPlayerProps) {
  // If we have a Mux playback ID, use MuxPlayer
  if (muxPlaybackId) {
    return (
      <MuxPlayer
        playbackId={muxPlaybackId}
        metadata={{
          video_title: title,
        }}
        className={className}
      />
    );
  }

  // If we have a Mux URL format (mux://playback_id), extract playback ID
  if (videoUrl && videoUrl.startsWith('mux://')) {
    const playbackId = videoUrl.replace('mux://', '');
    return (
      <MuxPlayer
        playbackId={playbackId}
        metadata={{
          video_title: title,
        }}
        className={className}
      />
    );
  }

  // Fallback to regular HTML5 video for legacy videos
  if (videoUrl) {
    return (
      <video
        src={videoUrl}
        controls={controls}
        autoPlay={autoPlay}
        muted={muted}
        className={className}
        preload="metadata"
      >
        Your browser does not support the video tag.
      </video>
    );
  }

  // No video source provided
  return (
    <div className={`${className} bg-gray-100 flex items-center justify-center`}>
      <div className="text-center text-gray-500">
        <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
        <p>No video available</p>
      </div>
    </div>
  );
}
