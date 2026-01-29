# Profile Picture Upload Fix Guide

## 🚨 Current Issue
Profile picture upload is not working properly. This is likely because the `avatars` storage bucket doesn't exist in your Supabase project.

## ✅ Solution Steps

### Step 1: Set Up Storage Bucket
1. **Open your Supabase Dashboard**
2. **Go to SQL Editor**
3. **Run the storage setup script**: Copy and paste `SUPABASE_STORAGE_SETUP.sql`
4. **Click "Run"** to execute the script

### Step 2: Verify Storage Setup
After running the script, you should see:
- ✅ `avatars` bucket created
- ✅ Storage policies configured
- ✅ File size limit set to 5MB
- ✅ Allowed image types: JPEG, PNG, GIF, WebP

### Step 3: Test the Upload
1. **Hot restart** your Flutter app (not just hot reload)
2. **Go to Profile screen**
3. **Tap on the profile picture** to edit
4. **Select an image** from camera or gallery
5. **Check the debug console** for detailed logs

## 🔍 Debug Information

The app now includes comprehensive debug logging. When you try to upload a profile picture, you'll see logs like:

```
🖼️ Starting profile picture upload for user: [user-id]
📁 File extension: jpg
📏 Image size: 123456 bytes
📤 Uploading to path: profile-pictures/profile_[user-id].jpg
📦 Bucket: avatars
👤 User ID: [user-id]
✅ Avatars bucket found
📤 Upload result: [upload-details]
🔗 Public URL: [public-url]
✅ Image uploaded successfully. URL: [url]
✅ Profile updated with new avatar URL
✅ User profile reloaded successfully
```

## 🚨 Common Issues & Solutions

### Issue 1: "Avatars bucket does not exist"
**Solution**: Run the `SUPABASE_STORAGE_SETUP.sql` script

### Issue 2: "Cannot access storage buckets"
**Solution**: Check your Supabase credentials and internet connection

### Issue 3: "Permission denied"
**Solution**: The storage policies should be created by the script, but you can also:
1. Go to **Storage** in Supabase Dashboard
2. Click on **avatars** bucket
3. Go to **Policies** tab
4. Ensure the policies are created

### Issue 4: "File too large"
**Solution**: The script sets a 5MB limit. If you need larger files, modify the script.

## 🎯 Expected Results

After fixing the storage bucket:
- ✅ **Image selection** works from camera/gallery
- ✅ **Upload progress** shows in debug logs
- ✅ **Profile picture** updates immediately
- ✅ **Image displays** correctly in profile
- ✅ **No error messages** in console

## 🔧 Manual Storage Setup (Alternative)

If the SQL script doesn't work, you can set up storage manually:

1. **Go to Storage** in Supabase Dashboard
2. **Click "New bucket"**
3. **Name**: `avatars`
4. **Public bucket**: ✅ (checked)
5. **File size limit**: 5MB
6. **Allowed MIME types**: `image/jpeg,image/png,image/gif,image/webp`
7. **Click "Create bucket"**

## 📱 Test the Complete Flow

1. **Sign in** to your app
2. **Navigate to Profile** screen
3. **Tap the profile picture** (camera icon should appear)
4. **Select "Camera" or "Gallery"**
5. **Choose an image**
6. **Wait for upload** (check debug logs)
7. **Verify image appears** in profile

## 🚨 If Still Not Working

1. **Check debug console** for specific error messages
2. **Verify Supabase connection** is working
3. **Ensure you're signed in** with a valid user
4. **Try with a smaller image** (under 1MB)
5. **Check internet connection**

The enhanced debug logging will help identify exactly where the upload process is failing!
