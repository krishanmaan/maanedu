# Supabase Users Table Setup Guide

## 🚨 Current Issue
The error `ERROR: 42P01: relation "public.users_id_seq" does not exist` indicates that the `users` table hasn't been created yet in your Supabase database.

## ✅ Solution Steps

### Step 1: Run the SQL Script
1. **Open your Supabase Dashboard**
2. **Go to SQL Editor** (left sidebar)
3. **Copy and paste** the contents of `sqlfile/users_table_setup_simple.sql`
4. **Click "Run"** to execute the script

### Step 2: Verify Table Creation
After running the script, you should see:
- ✅ `public.users` table created
- ✅ RLS policies enabled
- ✅ Storage bucket `avatars` created
- ✅ Trigger for automatic user creation

### Step 3: Test the Setup
1. **Go to Table Editor** in Supabase
2. **Check if `users` table exists** in the `public` schema
3. **Verify the columns** match the expected structure

## 🔧 What the Script Does

### Creates the `users` table with:
- **Primary Key**: `id` (UUID, references `auth.users`)
- **User Info**: `email`, `name`, `avatar`
- **Profile Data**: `phone`, `date_of_birth`, `gender`, etc.
- **Academic Info**: `education_level`, `school_college_name`, `batch_year`
- **Parent Info**: `parent_name`, `parent_phone`, `parent_email`
- **Status Fields**: `is_active`, `is_verified`, `profile_completed`
- **Timestamps**: `created_at`, `updated_at`, `enrollment_date`, `last_login`

### Sets up Security:
- **Row Level Security (RLS)** enabled
- **Policies** for users to manage only their own data
- **Storage policies** for avatar uploads

### Creates Automation:
- **Trigger** to automatically create user profile when someone signs up
- **Function** to handle new user creation

## 🎯 Expected Result
After running the script, your app should:
- ✅ Successfully create user profiles during signup
- ✅ Allow profile picture uploads
- ✅ Enable profile editing functionality
- ✅ Store all user data in the `users` table

## 🚨 If You Still Get Errors

### Error: "relation does not exist"
- Make sure you're running the script in the correct database
- Check that you're connected to the right Supabase project

### Error: "permission denied"
- Ensure you're running as a superuser or have the necessary permissions
- Try running the script in the Supabase SQL Editor (it has admin privileges)

### Error: "bucket already exists"
- This is normal - the script uses `ON CONFLICT DO NOTHING` to handle existing buckets

## 📱 Test Your App
After the setup is complete:
1. **Run your Flutter app**
2. **Try to sign up** with a new account
3. **Check the `users` table** in Supabase to see if the data was inserted
4. **Test profile picture upload** functionality

## 🔍 Troubleshooting
If you encounter issues:
1. **Check the Supabase logs** for detailed error messages
2. **Verify your Supabase connection** in the Flutter app
3. **Ensure the `avatars` storage bucket** exists and is public
4. **Check RLS policies** are correctly set up

The simplified script should resolve the `users_id_seq` error and create everything you need for the MaanEdu app to work properly!
