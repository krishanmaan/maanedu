# Banner Supabase Integration Setup Guide

This guide explains how to set up the dynamic banner system that loads banner data from Supabase.

## 🗄️ Database Setup

### 1. Run the SQL Migration

Execute the SQL file `supabase_banner_migration.sql` in your Supabase SQL editor:

```sql
-- This will create:
-- 1. banners table with all necessary fields
-- 2. RLS policies for security
-- 3. Sample banner data
-- 4. Helper functions and views
```

### 2. Table Structure

The `banners` table includes:
- `id` - UUID primary key
- `title` - Banner title (e.g., "12th Class")
- `subtitle` - Banner subtitle (e.g., "CUET/JEE Foundation")
- `description` - Optional description
- `image_url` - URL to banner image (Supabase Storage or external)
- `background_color` - Hex color for background gradient
- `text_color` - Hex color for text
- `badge_text` - Badge text (e.g., "YEAR BATCH 2024-25")
- `badge_color` - Hex color for badge
- `is_active` - Boolean to show/hide banner
- `display_order` - Order of display (lower numbers first)
- `target_route` - Optional route to navigate when tapped
- `created_at` / `updated_at` - Timestamps

## 🖼️ Image Storage Setup

### Option 1: Supabase Storage (Recommended)

1. **Create Storage Bucket:**
   ```sql
   -- In Supabase Dashboard > Storage
   -- Create bucket named "banners"
   ```

2. **Set Storage Policies:**
   ```sql
   -- Allow public read access
   CREATE POLICY "Public read access for banners" ON storage.objects
   FOR SELECT USING (bucket_id = 'banners');
   ```

3. **Upload Images:**
   - Upload banner images to the `banners` bucket
   - Copy the public URL and update the `image_url` field

### Option 2: External URLs

Use any image hosting service (Cloudinary, AWS S3, etc.) and store the full URL in the `image_url` field.

## 📱 Flutter App Integration

### Files Created/Modified:

1. **`lib/models/banner.dart`** - Banner data model
2. **`lib/providers/banner_provider.dart`** - State management for banners
3. **`lib/services/supabase_service.dart`** - Added banner methods
4. **`lib/screens/dashboard_screen.dart`** - Updated to use dynamic banners
5. **`lib/main.dart`** - Added BannerProvider to providers list

### Key Features:

- **Dynamic Loading:** Banners load from Supabase on app start
- **Fallback Support:** Shows default banner if Supabase fails
- **Error Handling:** Graceful error states with retry options
- **Pull to Refresh:** Refresh banners by pulling down on dashboard
- **Navigation:** Tap banner to navigate to target route
- **Customizable:** Colors, text, and images all configurable from database

## 🎨 Customization

### Adding New Banners

1. **Via Supabase Dashboard:**
   ```sql
   INSERT INTO banners (
     title, 
     subtitle, 
     image_url, 
     background_color, 
     text_color, 
     badge_text, 
     badge_color, 
     display_order,
     target_route
   ) VALUES (
     'New Banner',
     'Subtitle here',
     'https://your-image-url.com/banner.png',
     '#FF5722',
     '#FFFFFF',
     'NEW FEATURE',
     '#4CAF50',
     1,
     '/new-route'
   );
   ```

2. **Via Admin Panel:** (If you have one)
   - Create a form to add/edit banners
   - Include image upload functionality
   - Preview banner before saving

### Color Customization

Use hex color codes:
- `#FF5722` - Orange
- `#4CAF50` - Green  
- `#2196F3` - Blue
- `#9C27B0` - Purple
- `#E91E63` - Pink

### Banner Ordering

Set `display_order` field:
- Lower numbers appear first
- Use increments of 10 (1, 10, 20) for easy reordering

## 🔧 Testing

### Test Scenarios:

1. **Normal Flow:**
   - App loads → Banner loads from Supabase → Displays correctly

2. **Network Error:**
   - App loads → Supabase fails → Shows default banner

3. **Empty Database:**
   - No banners in database → Shows default banner

4. **Image Load Error:**
   - Invalid image URL → Falls back to default image

### Debug Information:

Check console logs for:
- `🔍 Querying Supabase banners table...`
- `✅ Successfully converted X banners`
- `❌ Database error getting banners:`

## 🚀 Production Deployment

### Checklist:

- [ ] Run SQL migration in production Supabase
- [ ] Upload banner images to storage
- [ ] Test banner loading in production
- [ ] Verify RLS policies are working
- [ ] Test error scenarios
- [ ] Monitor performance

### Performance Tips:

1. **Image Optimization:**
   - Use WebP format for better compression
   - Resize images to appropriate dimensions (400x180px recommended)
   - Use CDN for faster loading

2. **Caching:**
   - Banners are cached in provider state
   - Pull-to-refresh updates cache
   - Consider adding local storage cache for offline support

## 🛠️ Troubleshooting

### Common Issues:

1. **Banner not loading:**
   - Check Supabase connection
   - Verify RLS policies
   - Check console for errors

2. **Image not displaying:**
   - Verify image URL is accessible
   - Check storage bucket policies
   - Test URL in browser

3. **Colors not applying:**
   - Ensure hex color format (#RRGGBB)
   - Check color parsing in `_parseColor` method

4. **Navigation not working:**
   - Verify `target_route` exists in app router
   - Check route permissions

### Support:

For issues or questions:
1. Check console logs for error messages
2. Verify Supabase dashboard for data
3. Test with sample data first
4. Check network connectivity

## 📋 Sample Data

The migration includes sample banners:
- 12th Class banner with orange badge
- Advanced Learning banner with green badge  
- Live Classes banner with red badge

You can modify or add more banners as needed for your app's requirements.
