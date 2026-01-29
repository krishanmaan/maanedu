# 🐛 Classes Loading Debug Guide

## समस्या: Classes load नहीं हो रही हैं

### 🔍 **Debug Steps:**

#### 1. **Flutter Console Check करें**
Hot restart करके console में यह messages देखें:
```
🔄 Starting to load classes for course: [courseId]
🔍 Querying classes for course: [courseId]
📊 Supabase response: [...]
✅ Loaded X classes for course [courseId]
```

#### 2. **Debug UI Elements** (Debug mode में visible)
Course detail screen में अब दिखेगा:
- **Debug Info Box** (blue container)
- **Refresh Button** (header में)
- **Manual Reload Button** (empty state में)

#### 3. **Possible Issues & Solutions:**

**A. Supabase Connection Issue:**
```
❌ Database error: [connection error]
🔄 Trying mock data as fallback...
```
**Solution:** Check internet connection और Supabase URL

**B. Invalid Course ID:**
```
⚠️ No classes found in database for course [courseId]
```
**Solution:** Verify course ID और admin panel में classes add करें

**C. Database Schema Issue:**
```
❌ Error parsing class data: [error]
```
**Solution:** Check Supabase table structure

**D. No Classes in Database:**
```
📝 Using X mock classes as fallback
```
**Solution:** Admin panel से classes add करें

#### 4. **Manual Testing:**

**Step 1:** Debug box में check करें:
- Course ID correct है?
- Classes Count = 0?
- Loading = false?
- कोई Error message?

**Step 2:** Refresh button click करें (header में)

**Step 3:** अगर empty state है तो "Reload Classes" button try करें

#### 5. **Database Verification:**
Supabase dashboard में जाकर check करें:
```sql
SELECT * FROM classes WHERE course_id = 'YOUR_COURSE_ID';
```

#### 6. **Common Solutions:**

**Solution 1: Add image_url column**
```sql
ALTER TABLE classes ADD COLUMN IF NOT EXISTS image_url TEXT;
```

**Solution 2: Fix ordering**
```sql
-- Supabase में order_index column check करें
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'classes' AND column_name = 'order_index';
```

**Solution 3: Manual class insert test**
```sql
INSERT INTO classes (course_id, title, description, order_index) 
VALUES ('YOUR_COURSE_ID', 'Test Class', 'Test Description', 1);
```

### 📊 **Debug Output Examples:**

**Success Case:**
```
🔄 Starting to load classes for course: abc123
🔍 Querying classes for course: abc123
📊 Supabase response: [{id: xyz, title: Class 1, ...}]
✅ Loaded 3 classes for course abc123
📚 Class: Class 1 (30min)
📚 Class: Class 2 (45min)
```

**Failure Case:**
```
🔄 Starting to load classes for course: abc123
❌ Database error: Invalid course ID
🔄 Trying mock data as fallback...
📝 Using 5 mock classes as fallback
```

### 🎯 **Quick Fixes:**

1. **Hot Restart** Flutter app
2. **Check Debug Box** for real-time info
3. **Use Refresh Button** for manual reload
4. **Verify Course ID** in admin panel
5. **Add Test Class** via admin panel
6. **Check Console Logs** for detailed errors

### 📞 **Report Format:**
अगर अभी भी issue है तो share करें:
1. Debug box में क्या show हो रहा है
2. Console में कौन से messages आ रहे हैं
3. Course ID क्या है
4. Supabase में classes exist करते हैं या नहीं
