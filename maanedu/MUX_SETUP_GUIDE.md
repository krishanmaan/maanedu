# Mux Video Storage Integration Setup Guide

## Overview
This guide will help you configure Mux.com for video storage in your MaanEdu application. Mux provides professional video hosting, encoding, and streaming capabilities.

## Step 1: Create Mux Account
1. Go to [mux.com](https://mux.com) and create an account
2. Verify your email and complete the onboarding process

## Step 2: Get API Credentials
1. In your Mux dashboard, go to **Settings** → **Access Tokens**
2. Click **Generate New Token**
3. Give it a name like "MaanEdu Production"
4. Copy the **Token ID** and **Token Secret** (you won't see the secret again!)

## Step 3: Configure Environment Variables
Create a `.env.local` file in your `maanedu` directory with:

```env
# Mux Configuration
MUX_TOKEN_ID=your_mux_token_id_here
MUX_TOKEN_SECRET=your_mux_token_secret_here

# Your existing Supabase configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

**⚠️ IMPORTANT**: 
- Make sure the `.env.local` file is in the `maanedu` directory (same level as `package.json`)
- Restart your development server after adding environment variables
- Never commit `.env.local` to git (it should be in `.gitignore`)

## Step 4: Update Database Schema
Add the new Mux fields to your `classes` table in Supabase:

```sql
-- Add Mux asset tracking columns
ALTER TABLE classes 
ADD COLUMN mux_asset_id TEXT,
ADD COLUMN mux_playback_id TEXT;

-- Create index for better performance
CREATE INDEX idx_classes_mux_asset_id ON classes(mux_asset_id);
CREATE INDEX idx_classes_mux_playback_id ON classes(mux_playback_id);
```

## Step 5: Test the Integration
1. Start your development server: `npm run dev`
2. Go to any course's classes management page
3. Try uploading a video - it should now go to Mux instead of being stored as base64

## Features Enabled

### ✅ What's Working Now:
- **Direct Upload to Mux**: Videos are uploaded directly to Mux servers
- **Automatic Processing**: Mux handles video encoding and optimization
- **Progress Tracking**: Real-time upload and processing status
- **Professional Playback**: Uses Mux Player for optimal streaming
- **Automatic Thumbnails**: Mux generates video thumbnails automatically
- **Large File Support**: Up to 10GB files (much better than base64 storage)
- **Bandwidth Optimization**: Adaptive streaming based on user's connection

### 🔄 How It Works:
1. User selects a video file
2. App requests an upload URL from Mux via `/api/mux/upload`
3. Video uploads directly to Mux (not through your server)
4. Mux processes and encodes the video
5. App polls for processing completion
6. Once ready, playback ID is stored in your database
7. Videos play using Mux's optimized streaming

### 💡 Benefits Over Base64 Storage:
- **No Memory Issues**: No more browser crashes from large videos
- **Better Performance**: Optimized streaming vs large base64 strings
- **Professional Quality**: Adaptive bitrate streaming
- **Global CDN**: Fast video delivery worldwide
- **Analytics**: Video engagement metrics (available in Mux dashboard)

## Troubleshooting

### Quick Diagnosis:
1. **Test Mux Connection**: Click the "Test Mux" button in the classes page
2. **Check Console**: Open browser dev tools and check console for error messages
3. **Verify Environment**: Visit `/api/mux/test` to check if credentials are loaded

### Common Issues:

#### "Failed to retrieve asset information"
- **Cause**: Usually missing or incorrect Mux credentials
- **Solution**: 
  1. Verify `.env.local` exists in correct directory
  2. Check Mux token ID and secret are correct
  3. Restart development server after adding env vars
  4. Test connection with "Test Mux" button

#### "Module not found" errors
- **Cause**: Import path issues
- **Solution**: Files have been moved to correct locations, should be resolved

#### Upload fails or hangs
- **Cause**: Network issues or file size
- **Solution**: 
  1. Try smaller file first (under 100MB)
  2. Check network connection
  3. Verify CORS settings in Mux dashboard

### Debug Steps:
1. **Step 1**: Click "Test Mux" button - should show "Mux connection successful!"
2. **Step 2**: Check browser console for detailed error messages
3. **Step 3**: Try uploading a small test video (under 50MB)
4. **Step 4**: Check Mux dashboard at dashboard.mux.com for uploaded assets
5. **Step 5**: Verify database has `mux_asset_id` and `mux_playback_id` columns

### Environment Variables Check:
Run this in browser console to verify:
```javascript
fetch('/api/mux/test').then(r => r.json()).then(console.log)
```

## Cost Considerations
- Mux has a free tier with limited usage
- Pricing is based on video encoding minutes and streaming bandwidth
- Much more cost-effective than storing large video files in your database
- Check [Mux pricing](https://mux.com/pricing) for current rates

## Next Steps
After setup, you can:
- Upload videos through the admin interface
- Videos will automatically stream optimally to users
- Monitor usage in your Mux dashboard
- Add advanced features like video analytics
