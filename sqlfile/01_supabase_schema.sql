-- MaanEdu Database Schema for Supabase

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create courses table
CREATE TABLE IF NOT EXISTS courses (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    level VARCHAR(50),
    image_url TEXT,
    price DECIMAL(10,2) DEFAULT 0.00,
    instructor_id UUID,
    duration_hours INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create users table (if not exists)
CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    avatar_url TEXT,
    role VARCHAR(50) DEFAULT 'student',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create classes table
CREATE TABLE IF NOT EXISTS classes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    video_url TEXT,
    duration_minutes INTEGER DEFAULT 0,
    order_index INTEGER DEFAULT 0,
    is_free BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create enrollments table
CREATE TABLE IF NOT EXISTS enrollments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    progress_percentage DECIMAL(5,2) DEFAULT 0.00,
    UNIQUE(user_id, course_id)
);

-- Create progress table
CREATE TABLE IF NOT EXISTS progress (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
    watched_duration INTEGER DEFAULT 0,
    is_completed BOOLEAN DEFAULT false,
    last_watched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, class_id)
);

-- Create RLS (Row Level Security) policies
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress ENABLE ROW LEVEL SECURITY;

-- Courses policies
CREATE POLICY "Courses are viewable by everyone" ON courses
    FOR SELECT USING (true);

CREATE POLICY "Courses are insertable by authenticated users" ON courses
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Courses are updatable by owner" ON courses
    FOR UPDATE USING (auth.uid() = instructor_id);

CREATE POLICY "Courses are deletable by owner" ON courses
    FOR DELETE USING (auth.uid() = instructor_id);

-- Users policies
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

-- Classes policies
CREATE POLICY "Classes are viewable by everyone" ON classes
    FOR SELECT USING (true);

CREATE POLICY "Classes are insertable by course instructor" ON classes
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM courses 
            WHERE courses.id = classes.course_id 
            AND courses.instructor_id = auth.uid()
        )
    );

CREATE POLICY "Classes are updatable by course instructor" ON classes
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM courses 
            WHERE courses.id = classes.course_id 
            AND courses.instructor_id = auth.uid()
        )
    );

CREATE POLICY "Classes are deletable by course instructor" ON classes
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM courses 
            WHERE courses.id = classes.course_id 
            AND courses.instructor_id = auth.uid()
        )
    );

-- Enrollments policies
CREATE POLICY "Users can view their own enrollments" ON enrollments
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can enroll in courses" ON enrollments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own enrollments" ON enrollments
    FOR UPDATE USING (auth.uid() = user_id);

-- Progress policies
CREATE POLICY "Users can view their own progress" ON progress
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress" ON progress
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress" ON progress
    FOR UPDATE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_courses_category ON courses(category);
CREATE INDEX IF NOT EXISTS idx_courses_level ON courses(level);
CREATE INDEX IF NOT EXISTS idx_courses_instructor ON courses(instructor_id);
CREATE INDEX IF NOT EXISTS idx_classes_course ON classes(course_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_user ON enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_course ON enrollments(course_id);
CREATE INDEX IF NOT EXISTS idx_progress_user ON progress(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_class ON progress(class_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_courses_updated_at BEFORE UPDATE ON courses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON classes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data
INSERT INTO courses (title, description, category, level, price, image_url) VALUES
('Advanced Mathematics', 'Comprehensive course covering calculus, algebra, and trigonometry', 'Mathematics', 'Advanced', 2999.00, 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=400'),
('Physics Fundamentals', 'Learn the basics of physics including mechanics, thermodynamics, and waves', 'Physics', 'Beginner', 1999.00, 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400'),
('Organic Chemistry', 'Complete guide to organic chemistry reactions and mechanisms', 'Chemistry', 'Intermediate', 2499.00, 'https://images.unsplash.com/photo-1532187863486-abf9dbad1b69?w=400'),
('Biology Essentials', 'Understanding life sciences from cellular to organismal level', 'Biology', 'Beginner', 1799.00, 'https://images.unsplash.com/photo-1530026405186-ed1f139313f7?w=400'),
('English Literature', 'Explore classic and modern literature with critical analysis', 'English', 'Intermediate', 1599.00, 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400'),
('Programming Basics', 'Learn programming fundamentals with Python and JavaScript', 'Computer Science', 'Beginner', 2199.00, 'https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=400')
ON CONFLICT DO NOTHING;

-- Create views for easier querying
CREATE OR REPLACE VIEW course_stats AS
SELECT 
    c.id,
    c.title,
    c.category,
    c.level,
    c.price,
    COUNT(DISTINCT e.user_id) as enrolled_students,
    COUNT(cl.id) as total_classes,
    AVG(p.progress_percentage) as avg_progress
FROM courses c
LEFT JOIN enrollments e ON c.id = e.course_id
LEFT JOIN classes cl ON c.id = cl.course_id
LEFT JOIN progress p ON cl.id = p.class_id
GROUP BY c.id, c.title, c.category, c.level, c.price;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
