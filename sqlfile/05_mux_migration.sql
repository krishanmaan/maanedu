-- Mux Integration Migration for Classes Table
-- Run this in your Supabase SQL Editor

-- Add Mux asset tracking columns to classes table
ALTER TABLE classes 
ADD COLUMN IF NOT EXISTS mux_asset_id TEXT,
ADD COLUMN IF NOT EXISTS mux_playback_id TEXT;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_classes_mux_asset_id ON classes(mux_asset_id);
CREATE INDEX IF NOT EXISTS idx_classes_mux_playback_id ON classes(mux_playback_id);

-- Add comments to document the new columns
COMMENT ON COLUMN classes.mux_asset_id IS 'Mux asset ID for video storage and processing';
COMMENT ON COLUMN classes.mux_playback_id IS 'Mux playback ID for video streaming';

-- Optional: Add a check constraint to ensure either video_url OR mux_playback_id is present
-- ALTER TABLE classes 
-- ADD CONSTRAINT check_video_source 
-- CHECK (
--   (video_url IS NOT NULL AND video_url != '') OR 
--   (mux_playback_id IS NOT NULL AND mux_playback_id != '')
-- );
