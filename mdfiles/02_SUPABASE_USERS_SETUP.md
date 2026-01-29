# Supabase Users Table Setup Guide

## Overview
This guide will help you set up a comprehensive users table in Supabase for the MaanEdu app, including proper authentication, data storage, and security policies.

## Step 1: Run the SQL Script

1. Open your Supabase dashboard
2. Go to the SQL Editor
3. Copy and paste the contents of `sqlfile/users_table_setup.sql`
4. Execute the script

## Step 2: Verify Table Creation

After running the SQL script, you should see these tables created:

### Main Tables:
- `users` - Main user profiles
- `user_preferences` - User settings and preferences
- `user_achievements` - User achievements and badges
- `user_progress` - Course and class progress tracking

### Views:
- `user_profiles` - Public user profile view (without sensitive data)

## Step 3: Configure Storage Bucket

1. Go to Storage in your Supabase dashboard
2. Create a new bucket named `avatars`
3. Set the bucket to public if you want profile pictures to be publicly accessible
4. Configure the following policies:

```sql
-- Allow users to upload their own profile pictures
CREATE POLICY "Users can upload own avatar" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to update their own profile pictures
CREATE POLICY "Users can update own avatar" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'avatars' AND 
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public read access to avatars
CREATE POLICY "Public can view avatars" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');
```

## Step 4: Test the Setup

### Test User Registration:
1. Try registering a new user through your app
2. Check the `users` table to verify the user was created
3. Verify that the trigger automatically populated the user data

### Test Profile Updates:
1. Update user profile information
2. Check both `auth.users` metadata and `users` table
3. Verify that both are updated correctly

## Database Schema Details

### Users Table Fields:

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key, references auth.users(id) |
| `email` | TEXT | User's email address |
| `name` | TEXT | User's full name |
| `avatar` | TEXT | URL to profile picture |
| `phone` | TEXT | User's phone number |
| `date_of_birth` | DATE | User's date of birth |
| `gender` | TEXT | User's gender (male/female/other) |
| `address` | TEXT | User's address |
| `city` | TEXT | User's city |
| `state` | TEXT | User's state |
| `country` | TEXT | User's country (default: India) |
| `pincode` | TEXT | User's postal code |
| `education_level` | TEXT | User's education level |
| `school_college_name` | TEXT | User's school/college name |
| `parent_name` | TEXT | Parent/guardian name |
| `parent_phone` | TEXT | Parent/guardian phone |
| `parent_email` | TEXT | Parent/guardian email |
| `batch_year` | INTEGER | Academic batch year (default: 2025) |
| `enrollment_date` | TIMESTAMP | When user enrolled |
| `last_login` | TIMESTAMP | Last login time |
| `is_active` | BOOLEAN | Whether account is active |
| `is_verified` | BOOLEAN | Whether email is verified |
| `profile_completed` | BOOLEAN | Whether profile is complete |
| `created_at` | TIMESTAMP | Account creation time |
| `updated_at` | TIMESTAMP | Last update time |

## Security Features

### Row Level Security (RLS):
- Users can only view/edit their own data
- Public profiles are available through the `user_profiles` view
- Proper authentication checks on all operations

### Automatic Triggers:
- User profile automatically created on signup
- `updated_at` timestamp automatically updated on changes
- Last login tracking

## API Integration

The Flutter app is now configured to:

1. **Signup Process:**
   - Creates auth user
   - Automatically inserts into `users` table
   - Handles errors gracefully

2. **Profile Management:**
   - Updates both auth metadata and users table
   - Fetches data from users table (with fallback to auth metadata)
   - Supports profile picture uploads

3. **Data Consistency:**
   - Maintains sync between auth.users and users table
   - Handles edge cases and errors
   - Provides fallback mechanisms

## Troubleshooting

### Common Issues:

1. **User not created in users table:**
   - Check if the trigger function exists
   - Verify RLS policies are correct
   - Check Supabase logs for errors

2. **Profile updates not working:**
   - Verify user authentication
   - Check RLS policies
   - Ensure proper permissions

3. **Storage upload issues:**
   - Verify bucket exists and is public
   - Check storage policies
   - Verify file size limits

### Debug Queries:

```sql
-- Check if user exists in users table
SELECT * FROM users WHERE email = 'user@example.com';

-- Check auth user metadata
SELECT * FROM auth.users WHERE email = 'user@example.com';

-- Check user preferences
SELECT * FROM user_preferences WHERE user_id = 'user-uuid';

-- Check recent user activity
SELECT * FROM users ORDER BY last_login DESC LIMIT 10;
```

## Next Steps

1. **Customize Fields:** Add or remove fields based on your requirements
2. **Add Validation:** Implement additional data validation rules
3. **Analytics:** Set up user analytics and reporting
4. **Backup:** Configure regular database backups
5. **Monitoring:** Set up monitoring and alerting

## Support

If you encounter any issues:
1. Check the Supabase logs
2. Verify your RLS policies
3. Test with the debug queries above
4. Review the Flutter app logs for API errors
