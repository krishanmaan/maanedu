-- Create links table for storing external links with thumbnails
CREATE TABLE IF NOT EXISTS links (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    url TEXT NOT NULL,
    thumbnail_url TEXT,
    category VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0,
    created_by UUID REFERENCES auth.users(id),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_links_active ON links(is_active);
CREATE INDEX IF NOT EXISTS idx_links_category ON links(category);
CREATE INDEX IF NOT EXISTS idx_links_sort_order ON links(sort_order);
CREATE INDEX IF NOT EXISTS idx_links_created_at ON links(created_at DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE links ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS
-- Allow authenticated users to read active links
CREATE POLICY "Allow authenticated users to read active links" ON links
    FOR SELECT USING (auth.role() = 'authenticated' AND is_active = TRUE);

-- Allow authenticated users to read all links (for admin purposes)
CREATE POLICY "Allow authenticated users to read all links" ON links
    FOR SELECT USING (auth.role() = 'authenticated');

-- Allow authenticated users to insert links (if they want to add their own)
CREATE POLICY "Allow authenticated users to insert links" ON links
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Allow users to update their own links
CREATE POLICY "Allow users to update their own links" ON links
    FOR UPDATE USING (auth.uid() = created_by);

-- Allow users to delete their own links
CREATE POLICY "Allow users to delete their own links" ON links
    FOR DELETE USING (auth.uid() = created_by);

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_links_updated_at 
    BEFORE UPDATE ON links 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample data
INSERT INTO links (title, description, url, thumbnail_url, category, sort_order) VALUES
('Google Classroom', 'Access your Google Classroom for assignments and resources', 'https://classroom.google.com', 'https://via.placeholder.com/300x200/4285f4/ffffff?text=Google+Classroom', 'Education', 1),
('YouTube Learning', 'Educational videos and tutorials', 'https://youtube.com', 'https://via.placeholder.com/300x200/ff0000/ffffff?text=YouTube', 'Education', 2),
('Khan Academy', 'Free online courses and lessons', 'https://khanacademy.org', 'https://via.placeholder.com/300x200/14a085/ffffff?text=Khan+Academy', 'Education', 3),
('Coursera', 'Online courses from top universities', 'https://coursera.org', 'https://via.placeholder.com/300x200/0056d3/ffffff?text=Coursera', 'Education', 4),
('TED Talks', 'Inspiring talks and presentations', 'https://ted.com', 'https://via.placeholder.com/300x200/e62b1e/ffffff?text=TED+Talks', 'Education', 5);

-- Create a view for easy access to active links
CREATE OR REPLACE VIEW active_links AS
SELECT 
    id,
    title,
    description,
    url,
    thumbnail_url,
    category,
    created_at,
    updated_at,
    sort_order,
    metadata
FROM links 
WHERE is_active = TRUE 
ORDER BY sort_order ASC, created_at DESC;

-- Grant permissions on the view
GRANT SELECT ON active_links TO authenticated;
