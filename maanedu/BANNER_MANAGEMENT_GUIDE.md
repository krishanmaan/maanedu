# Banner Management System Guide

## Overview
The Banner Management System allows administrators to create, edit, and manage homepage banners that are displayed in the Flutter app dashboard. These banners are stored in Supabase and can be dynamically controlled through the admin panel.

## Features

### ✅ What's Available:
- **Create New Banners**: Add promotional banners with custom images, colors, and text
- **Edit Existing Banners**: Modify banner content, images, and settings
- **Delete Banners**: Remove banners that are no longer needed
- **Toggle Active/Inactive**: Enable or disable banners without deleting them
- **Image Upload**: Upload banner images directly or use image URLs
- **Color Customization**: Set background colors, text colors, and badge colors
- **Display Order**: Control the order in which banners appear
- **Target Routes**: Set navigation routes when banners are tapped

### 🎨 Banner Properties:
- **Title**: Main banner title (required)
- **Subtitle**: Secondary text (optional)
- **Description**: Detailed description (optional)
- **Image**: Banner background image (required)
- **Background Color**: Hex color code for background
- **Text Color**: Hex color code for text
- **Badge Text**: Optional badge text (e.g., "YEAR BATCH 2024-25")
- **Badge Color**: Hex color code for badge
- **Display Order**: Numeric order for banner sorting
- **Target Route**: Navigation route when banner is tapped
- **Active Status**: Enable/disable banner visibility

## How to Use

### Accessing Banner Management:
1. Log into the admin dashboard
2. Click on "Banners" in the sidebar navigation
3. You'll see the banner management interface

### Creating a New Banner:
1. Click "Add New Banner" button
2. Fill in the banner details:
   - Enter a title (required)
   - Add subtitle and description (optional)
   - Upload an image or enter an image URL
   - Set colors using the color pickers
   - Add badge text and color (optional)
   - Set display order (lower numbers appear first)
   - Enter target route (optional)
   - Toggle active status
3. Click "Create Banner"

### Editing a Banner:
1. Find the banner in the list
2. Click "Edit" button
3. Modify the fields as needed
4. Click "Update Banner"

### Managing Banner Status:
- Click the "Active/Inactive" button to toggle banner visibility
- Active banners appear in the Flutter app
- Inactive banners are hidden but not deleted

### Deleting a Banner:
1. Click "Delete" button next to the banner
2. Confirm the deletion in the popup
3. Banner will be permanently removed

## Image Upload Options

### Option 1: File Upload
- Click the upload area
- Select an image file (PNG, JPG, GIF)
- Maximum file size: 5MB
- Image will be converted to base64 and stored in database

### Option 2: URL Input
- Enter a direct image URL
- Useful for images hosted on external services
- Must be a publicly accessible URL

## Database Schema

The banners are stored in the `banners` table with the following structure:

```sql
CREATE TABLE banners (
    id UUID PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    subtitle VARCHAR(255),
    description TEXT,
    image_url TEXT NOT NULL,
    background_color VARCHAR(7) DEFAULT '#6D57FC',
    text_color VARCHAR(7) DEFAULT '#FFFFFF',
    badge_text VARCHAR(100),
    badge_color VARCHAR(7) DEFAULT '#FF9800',
    is_active BOOLEAN DEFAULT true,
    display_order INTEGER DEFAULT 0,
    target_route VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Integration with Flutter App

The Flutter app fetches banners using the `BannerProvider` which:
1. Loads the primary banner (first active banner by display order)
2. Displays the banner in the dashboard screen
3. Handles banner tap navigation if target route is set
4. Shows fallback banner if no active banners exist

## Best Practices

### Image Guidelines:
- Use high-quality images (recommended: 1200x400px or similar aspect ratio)
- Keep file sizes under 5MB for optimal performance
- Use web-optimized formats (JPEG for photos, PNG for graphics with transparency)

### Content Guidelines:
- Keep titles concise and impactful
- Use clear, readable fonts and colors
- Ensure good contrast between text and background
- Test banner appearance on different screen sizes

### Display Order:
- Use lower numbers for higher priority banners
- Leave gaps in numbering for easy reordering
- Consider seasonal or promotional banner rotation

## Troubleshooting

### Common Issues:

#### Banner Not Appearing in Flutter App:
- Check if banner is marked as "Active"
- Verify display order is set correctly
- Ensure image URL is accessible

#### Image Upload Fails:
- Check file size (must be under 5MB)
- Verify file format (PNG, JPG, GIF only)
- Try using image URL instead of file upload

#### Database Connection Issues:
- Verify Supabase credentials are configured
- Check network connectivity
- Review browser console for error messages

## Security Notes

- Only authenticated users can manage banners
- Image uploads are validated for file type and size
- All banner data is stored securely in Supabase
- RLS (Row Level Security) policies protect banner data

## Future Enhancements

Potential improvements for the banner system:
- Banner scheduling (start/end dates)
- A/B testing for different banner versions
- Banner analytics and click tracking
- Bulk banner operations
- Banner templates and presets
- Integration with external image hosting services
