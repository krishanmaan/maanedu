# Class Creation Testing Guide

## Step 1: Check Console Errors
1. Browser में Developer Tools खोलें (F12)
2. Console tab पर जाएं
3. Class add करने की कोशिश करें
4. कोई error messages देखें

## Step 2: Test Basic Class Creation (Without Image)
पहले बिना thumbnail के class add करने की कोशिश करें:

1. **Title:** "Test Class 1"
2. **Description:** "This is a test class"
3. **Video URL:** छोड़ दें (empty)
4. **Thumbnail:** कोई image upload न करें
5. **Duration:** 10
6. **Free Preview:** unchecked

## Step 3: Check Supabase Database
1. Supabase dashboard में जाएं
2. Table Editor → classes table
3. Check करें कि क्या entry add हुई है

## Step 4: Common Issues और Solutions

### Issue 1: Column doesn't exist
**Error:** `column "image_url" of relation "classes" does not exist`

**Solution:** 
```sql
ALTER TABLE classes ADD COLUMN image_url TEXT;
```

### Issue 2: Permission denied
**Error:** `permission denied for table classes`

**Solution:** RLS policies check करें

### Issue 3: Invalid course_id
**Error:** `foreign key constraint fails`

**Solution:** Valid course ID use करें

## Step 5: Enable Debugging
हमने console.log statements add किए हैं:
- "Loading classes for course: [courseId]"
- "Saving class data: [data]"
- "Loaded classes data: [data]"

यह messages browser console में दिखेंगे।

## Step 6: Manual Database Check
Supabase SQL Editor में यह query run करें:
```sql
SELECT * FROM classes WHERE course_id = 'YOUR_COURSE_ID';
```

## Expected Behavior:
1. Form submit करने पर success message दिखना चाहिए
2. Classes list में नई class appear होनी चाहिए
3. Console में proper log messages आने चाहिए
