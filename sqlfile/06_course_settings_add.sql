-- Adds a JSONB column to store extended wizard data for courses
-- Run this in Supabase SQL editor or via CLI

ALTER TABLE courses
ADD COLUMN IF NOT EXISTS settings JSONB;

-- Optional: if you also want to persist featured/video info on the course row
-- (uncomment if needed)
-- ALTER TABLE courses ADD COLUMN IF NOT EXISTS featured BOOLEAN DEFAULT false;
-- ALTER TABLE courses ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Create an index to query settings keys efficiently (optional)
CREATE INDEX IF NOT EXISTS idx_courses_settings_gin ON courses USING GIN (settings);


