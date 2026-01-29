# 🎓 MaanEdu Admin Dashboard Setup Guide

## 📋 Overview

This admin dashboard allows you to manage courses, users, and content for the MaanEdu educational platform. It's built with HTML, JavaScript, and integrates with Supabase for data management.

## 🚀 Quick Start

### 1. Supabase Database Setup

1. **Go to [Supabase](https://supabase.com)** and create a new project
2. **Copy your project URL and anon key** from Settings > API
3. **Run the SQL schema** in the SQL Editor:

```sql
-- Copy and paste the contents of supabase_schema.sql
-- This will create all necessary tables and sample data
```

### 2. Configure Admin Dashboard

1. **Open `web/admin/index.html`** in your browser
2. **Update Supabase credentials** in the JavaScript section:

```javascript
const SUPABASE_URL = 'YOUR_SUPABASE_PROJECT_URL';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
```

### 3. Access the Dashboard

- **Local**: Open `web/admin/index.html` in your browser
- **Deployed**: Upload to any web hosting service

## 🛠️ Features

### 📊 Dashboard Statistics
- **Total Courses**: Number of available courses
- **Total Users**: Registered users count
- **Total Classes**: Video lessons count
- **Total Revenue**: Sum of all course prices

### 📚 Course Management
- **Add New Courses**: Complete form with title, description, category, level, price
- **Edit Courses**: Update existing course information
- **Delete Courses**: Remove courses with confirmation
- **View All Courses**: List with search and filter options

### 🎨 User Interface
- **Modern Design**: Clean, responsive interface
- **Real-time Updates**: Instant feedback on actions
- **Mobile Friendly**: Works on all devices
- **Professional Styling**: Gradient backgrounds and smooth animations

## 📁 File Structure

```
maanedu/
├── web/
│   └── admin/
│       └── index.html          # Main admin dashboard
├── supabase_schema.sql         # Database schema
├── ADMIN_SETUP.md             # This setup guide
└── lib/                       # Flutter app files
    ├── screens/
    │   └── online_courses_screen.dart
    └── ...
```

## 🔧 Database Schema

### Tables Created:
- **`courses`**: Course information (title, description, price, etc.)
- **`users`**: User profiles and authentication
- **`classes`**: Individual video lessons within courses
- **`enrollments`**: Student course enrollments
- **`progress`**: Student progress tracking

### Sample Data:
- 6 pre-loaded courses in different categories
- Professional course images from Unsplash
- Realistic pricing and descriptions

## 🎯 How to Use

### Adding a New Course:
1. Fill out the "Add New Course" form
2. Include course title, description, category, level
3. Set price and optional image URL
4. Click "Add Course" button
5. Course appears instantly in the list

### Editing a Course:
1. Click "Edit" button on any course
2. Modal opens with current course data
3. Make changes to any field
4. Click "Update Course" to save

### Deleting a Course:
1. Click "Delete" button on any course
2. Confirm deletion in popup
3. Course is removed from database

## 🔒 Security Features

### Row Level Security (RLS):
- **Public Read Access**: Anyone can view courses
- **Authenticated Write Access**: Only logged-in users can create courses
- **Owner-based Updates**: Only course creators can edit/delete their courses

### Data Validation:
- **Required Fields**: Title, description, category, level, price
- **Price Validation**: Must be positive number
- **URL Validation**: Image URLs are optional but validated

## 🌐 Deployment Options

### Option 1: Local Development
```bash
# Simply open the HTML file in your browser
open web/admin/index.html
```

### Option 2: GitHub Pages
1. Push code to GitHub repository
2. Enable GitHub Pages in repository settings
3. Access via `https://username.github.io/repository-name/web/admin/`

### Option 3: Netlify/Vercel
1. Upload `web/admin/` folder
2. Deploy automatically
3. Get live URL for admin access

### Option 4: Traditional Web Hosting
1. Upload `web/admin/index.html` to your web server
2. Access via your domain: `https://yourdomain.com/admin/`

## 🔧 Customization

### Styling:
- **Colors**: Update CSS variables in the `<style>` section
- **Layout**: Modify grid layouts and spacing
- **Fonts**: Change font families and sizes

### Functionality:
- **Categories**: Add/remove course categories in the form
- **Levels**: Modify difficulty levels
- **Fields**: Add custom fields to course form

### Integration:
- **Analytics**: Add Google Analytics tracking
- **Notifications**: Integrate with email/SMS services
- **File Upload**: Add image upload functionality

## 🐛 Troubleshooting

### Common Issues:

1. **"Error loading courses"**
   - Check Supabase URL and API key
   - Verify database tables exist
   - Check browser console for errors

2. **"Permission denied"**
   - Ensure RLS policies are set up correctly
   - Check user authentication status
   - Verify table permissions

3. **"Form not submitting"**
   - Check required fields are filled
   - Verify internet connection
   - Check browser console for JavaScript errors

### Debug Mode:
```javascript
// Add this to see detailed error messages
console.log('Supabase client:', supabase);
console.log('Courses data:', courses);
```

## 📞 Support

### For Technical Issues:
1. Check browser console for error messages
2. Verify Supabase connection
3. Test with sample data first

### For Feature Requests:
- Add new fields to course form
- Implement user management
- Add analytics dashboard
- Create course templates

## 🎉 Success!

Once set up, you'll have a fully functional admin dashboard that:
- ✅ Manages courses in real-time
- ✅ Integrates with your Flutter app
- ✅ Provides professional UI/UX
- ✅ Scales with your business needs

**Happy Course Management! 🚀**
