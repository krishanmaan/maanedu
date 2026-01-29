# 🐛 Class Add Error Debugging Guide

## Current Error: "Failed to save class"

### 🔍 Step-by-Step Debugging:

#### 1. **Open Browser Console**
- F12 → Console tab
- Clear any old messages

#### 2. **Test Database Connection**
- Click the **"Test DB"** button (orange button)
- Check console for detailed logs:
  ```
  === SUPABASE CONNECTION TEST ===
  Basic connection test: {...}
  Attempting to insert minimal class: {...}
  Insert test result: {...}
  ```

#### 3. **Check for Common Errors**

**A. Permission Error:**
```
"permission denied for table classes"
```
**Fix:** Update RLS policies in Supabase

**B. Column doesn't exist:**
```
"column 'image_url' of relation 'classes' does not exist"
```
**Fix:** Run this in Supabase SQL Editor:
```sql
ALTER TABLE classes ADD COLUMN image_url TEXT;
```

**C. Foreign Key Error:**
```
"insert or update on table violates foreign key constraint"
```
**Fix:** Invalid course_id - check if course exists

**D. Network Error:**
```
"Failed to fetch" or "Network error"
```
**Fix:** Check Supabase URL and API key

#### 4. **Manual Database Check**
Run in Supabase SQL Editor:
```sql
-- Check if classes table exists
SELECT * FROM information_schema.tables WHERE table_name = 'classes';

-- Check table structure
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'classes';

-- Check RLS policies
SELECT * FROM pg_policies WHERE tablename = 'classes';

-- Test insert manually (replace with actual course ID)
INSERT INTO classes (course_id, title, order_index) 
VALUES ('your-course-id-here', 'Manual Test Class', 1);
```

#### 5. **Check Supabase Setup**
1. **API URL:** `https://aadryjquxyiwtntlrsti.supabase.co`
2. **API Key:** Check if key is valid
3. **RLS:** Check if Row Level Security allows inserts

#### 6. **Common Solutions**

**Solution 1: Add missing column**
```sql
ALTER TABLE classes ADD COLUMN image_url TEXT;
```

**Solution 2: Fix RLS policies**
```sql
-- Allow inserts for authenticated users
CREATE POLICY "Enable insert for authenticated users" ON classes
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Or allow all inserts (less secure)
CREATE POLICY "Enable insert for all users" ON classes
    FOR INSERT WITH CHECK (true);
```

**Solution 3: Update schema if needed**
```sql
-- Ensure all required columns exist
ALTER TABLE classes 
ADD COLUMN IF NOT EXISTS video_url TEXT,
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS duration_minutes INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_free BOOLEAN DEFAULT false;
```

### 📊 **Debug Output to Share**
After clicking "Test DB", share these console outputs:
1. Basic connection test result
2. Insert test result
3. Any error messages with full details

### 🎯 **Quick Fix Commands**
Run these in Supabase SQL Editor:

```sql
-- 1. Add missing column
ALTER TABLE classes ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 2. Allow inserts (choose one based on your security needs)
CREATE POLICY "classes_insert_policy" ON classes FOR INSERT WITH CHECK (true);

-- 3. Verify table structure
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'classes' ORDER BY ordinal_position;
```

### 📞 **What to Report**
Please share:
1. Complete console output after clicking "Test DB"
2. Any red error messages
3. Your Supabase project settings (RLS enabled/disabled)
4. Table structure from SQL query above
