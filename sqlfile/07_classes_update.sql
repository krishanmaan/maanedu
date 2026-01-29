-- Add image_url column to classes table if it doesn't exist
-- Run this SQL in your Supabase SQL Editor

-- Check if column exists and add it if it doesn't
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'classes' 
        AND column_name = 'image_url'
    ) THEN
        ALTER TABLE classes ADD COLUMN image_url TEXT;
        RAISE NOTICE 'Added image_url column to classes table';
    ELSE
        RAISE NOTICE 'image_url column already exists in classes table';
    END IF;
END $$;

-- Verify the table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'classes' 
ORDER BY ordinal_position;
