-- Simple Users Table Setup for MaanEdu
-- Run this script in your Supabase SQL Editor

-- Drop the table if it exists (to start fresh)
DROP TABLE IF EXISTS public.users CASCADE;

-- Create the 'users' table
CREATE TABLE public.users (
    id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
    email text UNIQUE NOT NULL,
    name text,
    avatar text,
    phone text,
    date_of_birth date,
    gender text,
    address text,
    city text,
    state text,
    country text DEFAULT 'India',
    pincode text,
    education_level text,
    school_college_name text,
    parent_name text,
    parent_phone text,
    parent_email text,
    batch_year integer DEFAULT 2025,
    enrollment_date timestamp with time zone DEFAULT now(),
    last_login timestamp with time zone,
    is_active boolean DEFAULT TRUE,
    is_verified boolean DEFAULT FALSE,
    profile_completed boolean DEFAULT FALSE,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS users_email_idx ON public.users USING btree (email);
CREATE INDEX IF NOT EXISTS users_name_idx ON public.users USING btree (name);

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Policy for authenticated users to view their own profile
CREATE POLICY "Users can view their own profile." ON public.users
FOR SELECT USING (auth.uid() = id);

-- Policy for authenticated users to insert their own profile
CREATE POLICY "Users can insert their own profile." ON public.users
FOR INSERT WITH CHECK (auth.uid() = id);

-- Policy for authenticated users to update their own profile
CREATE POLICY "Users can update their own profile." ON public.users
FOR UPDATE USING (auth.uid() = id);

-- Create a function to automatically create a user profile
-- when a new user signs up via auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, created_at, updated_at)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'name', now(), now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to call the handle_new_user function
-- This trigger will fire after a new user is inserted into auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create Storage Bucket for avatars (if it doesn't exist)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Create policies for the 'avatars' storage bucket
-- Allow authenticated users to upload their own avatar
CREATE POLICY "Allow authenticated users to upload their own avatar" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid() = (storage.foldername(name))[2]::uuid);

-- Allow authenticated users to view avatars
CREATE POLICY "Allow authenticated users to view avatars" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

-- Allow authenticated users to update their own avatar
CREATE POLICY "Allow authenticated users to update their own avatar" ON storage.objects
FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid() = (storage.foldername(name))[2]::uuid);

-- Allow authenticated users to delete their own avatar
CREATE POLICY "Allow authenticated users to delete their own avatar" ON storage.objects
FOR DELETE USING (bucket_id = 'avatars' AND auth.uid() = (storage.foldername(name))[2]::uuid);

-- Add table comment
COMMENT ON TABLE public.users IS 'Main users table storing profile information';

-- Add column comments
COMMENT ON COLUMN public.users.id IS 'Primary key, references auth.users.id';
COMMENT ON COLUMN public.users.email IS 'User email address';
COMMENT ON COLUMN public.users.name IS 'User full name';
COMMENT ON COLUMN public.users.avatar IS 'URL to user profile picture';
COMMENT ON COLUMN public.users.batch_year IS 'Academic batch year';
COMMENT ON COLUMN public.users.profile_completed IS 'Whether user has completed profile setup';
COMMENT ON COLUMN public.users.is_active IS 'Whether user account is active';
COMMENT ON COLUMN public.users.is_verified IS 'Whether user email is verified';
