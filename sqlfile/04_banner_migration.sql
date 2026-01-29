-- Banner Table Migration for MaanEdu
-- This file creates the banners table and related functionality

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create banners table
CREATE TABLE IF NOT EXISTS banners (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    subtitle VARCHAR(255),
    description TEXT,
    image_url TEXT NOT NULL,
    background_color VARCHAR(7) DEFAULT '#6D57FC', -- Hex color code
    text_color VARCHAR(7) DEFAULT '#FFFFFF', -- Hex color code
    badge_text VARCHAR(100), -- e.g., "YEAR BATCH 2024-25"
    badge_color VARCHAR(7) DEFAULT '#FF9800', -- Hex color code
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    target_route VARCHAR(255), -- Optional route to navigate when banner is tapped
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE banners ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for banners
CREATE POLICY "Banners are viewable by everyone" ON banners
    FOR SELECT USING (is_active = true);

CREATE POLICY "Banners are insertable by authenticated users" ON banners
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Banners are updatable by authenticated users" ON banners
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Banners are deletable by authenticated users" ON banners
    FOR DELETE USING (auth.role() = 'authenticated');

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_banners_active ON banners(is_active);
CREATE INDEX IF NOT EXISTS idx_banners_display_order ON banners(display_order);

-- Create function to update updated_at timestamp (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for updated_at
CREATE TRIGGER update_banners_updated_at BEFORE UPDATE ON banners
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample banner data
INSERT INTO banners (
    title, 
    subtitle, 
    description, 
    image_url, 
    background_color, 
    text_color, 
    badge_text, 
    badge_color, 
    display_order,
    target_route
) VALUES
(
    '12th Class',
    'CUET/JEE Foundation',
    'Comprehensive preparation for 12th class students with CUET and JEE foundation courses',
    'https://your-supabase-storage-url/banners/12th-class-banner.png',
    '#1A237E',
    '#FFFFFF',
    'YEAR BATCH 2024-25',
    '#FF9800',
    1,
    '/online-courses'
),
(
    'Advanced Learning',
    'Premium Courses Available',
    'Access to premium courses with expert instructors and comprehensive study materials',
    'https://your-supabase-storage-url/banners/advanced-learning-banner.png',
    '#6D57FC',
    '#FFFFFF',
    'PREMIUM ACCESS',
    '#4CAF50',
    2,
    '/courses'
),
(
    'Live Classes',
    'Interactive Learning Experience',
    'Join live interactive classes with real-time doubt solving and peer interaction',
    'https://your-supabase-storage-url/banners/live-classes-banner.png',
    '#E91E63',
    '#FFFFFF',
    'LIVE NOW',
    '#FF5722',
    3,
    '/live-classes'
)
ON CONFLICT DO NOTHING;

-- Create a view for active banners ordered by display order
CREATE OR REPLACE VIEW active_banners AS
SELECT 
    id,
    title,
    subtitle,
    description,
    image_url,
    background_color,
    text_color,
    badge_text,
    badge_color,
    display_order,
    target_route,
    created_at,
    updated_at
FROM banners
WHERE is_active = true
ORDER BY display_order ASC, created_at DESC;

-- Grant permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON banners TO anon, authenticated;
GRANT ALL ON active_banners TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Create function to get the primary banner (first active banner)
CREATE OR REPLACE FUNCTION get_primary_banner()
RETURNS TABLE (
    id UUID,
    title VARCHAR(255),
    subtitle VARCHAR(255),
    description TEXT,
    image_url TEXT,
    background_color VARCHAR(7),
    text_color VARCHAR(7),
    badge_text VARCHAR(100),
    badge_color VARCHAR(7),
    target_route VARCHAR(255)
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        b.id,
        b.title,
        b.subtitle,
        b.description,
        b.image_url,
        b.background_color,
        b.text_color,
        b.badge_text,
        b.badge_color,
        b.target_route
    FROM banners b
    WHERE b.is_active = true
    ORDER BY b.display_order ASC, b.created_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_primary_banner() TO anon, authenticated;
