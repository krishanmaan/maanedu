import 'package:flutter/foundation.dart';
import 'dart:async';
import '../models/course.dart';
import '../models/class.dart';
import '../services/supabase_service.dart';
import '../services/enhanced_storage_service.dart';
import '../services/realtime_service.dart';
import '../services/sync_service.dart';

class CourseProvider extends ChangeNotifier {
  final SupabaseService _supabaseService = SupabaseService.instance;
  final EnhancedStorageService _storage = EnhancedStorageService.instance;
  final RealtimeService _realtime = RealtimeService.instance;
  final SyncService _sync = SyncService.instance;
  
  List<Course> _courses = [];
  List<Class> _classes = [];
  Course? _selectedCourse;
  Class? _selectedClass;
  bool _isLoadingCourses = false;
  bool _isLoadingClasses = false;
  String? _errorMessage;
  final Map<String, bool> _enrollmentCache = {};
  
  // Stream subscriptions
  StreamSubscription<Course>? _courseUpdatesSubscription;
  StreamSubscription<Class>? _classUpdatesSubscription;
  StreamSubscription<bool>? _syncStatusSubscription;

  List<Course> get courses => _courses;
  List<Class> get classes => _classes;
  Course? get selectedCourse => _selectedCourse;
  Class? get selectedClass => _selectedClass;
  bool get isLoadingCourses => _isLoadingCourses;
  bool get isLoadingClasses => _isLoadingClasses;
  String? get errorMessage => _errorMessage;
  bool isCoursePurchased(String courseId) => _enrollmentCache[courseId] == true;

  // Get classes count for a specific course
  int getClassesCountForCourse(String courseId) {
    return _classes.where((classItem) => classItem.courseId == courseId).length;
  }

  // Initialize provider with enhanced services
  Future<void> initialize() async {
    try {
      if (kDebugMode) {
        debugPrint('🔄 Initializing CourseProvider with enhanced services...');
      }
      
      // Initialize services
      await _storage.initialize();
      await _realtime.initialize();
      await _sync.initialize();
      
      // Listen to real-time updates
      _courseUpdatesSubscription = _realtime.courseUpdatesStream.listen(
        _handleCourseUpdate,
        onError: (error) {
          if (kDebugMode) {
            debugPrint('❌ Course updates stream error: $error');
          }
        },
      );
      
      _classUpdatesSubscription = _realtime.classUpdatesStream.listen(
        _handleClassUpdate,
        onError: (error) {
          if (kDebugMode) {
            debugPrint('❌ Class updates stream error: $error');
          }
        },
      );
      
      // Listen to sync status
      _syncStatusSubscription = _sync.syncStatusStream.listen(
        (isOnline) {
          if (kDebugMode) {
            debugPrint('🌐 Sync status changed: ${isOnline ? 'Online' : 'Offline'}');
          }
          notifyListeners();
        },
        onError: (error) {
          if (kDebugMode) {
            debugPrint('❌ Sync status stream error: $error');
          }
        },
      );
      
      if (kDebugMode) {
        debugPrint('✅ CourseProvider initialized successfully');
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('❌ Error initializing CourseProvider: $e');
      }
    }
  }

  // Handle real-time course updates
  void _handleCourseUpdate(Course updatedCourse) {
    try {
      final index = _courses.indexWhere((c) => c.id == updatedCourse.id);
      if (index != -1) {
        _courses[index] = updatedCourse;
        
        // Update selected course if it's the same
        if (_selectedCourse?.id == updatedCourse.id) {
          _selectedCourse = updatedCourse;
        }
        
        if (kDebugMode) {
          debugPrint('🔄 Updated course: ${updatedCourse.title}');
        }
        notifyListeners();
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('❌ Error handling course update: $e');
      }
    }
  }

  // Handle real-time class updates
  void _handleClassUpdate(Class updatedClass) {
    try {
      final index = _classes.indexWhere((c) => c.id == updatedClass.id);
      if (index != -1) {
        _classes[index] = updatedClass;
        
        // Update selected class if it's the same
        if (_selectedClass?.id == updatedClass.id) {
          _selectedClass = updatedClass;
        }
        
        if (kDebugMode) {
          debugPrint('🔄 Updated class: ${updatedClass.title}');
        }
        notifyListeners();
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('❌ Error handling class update: $e');
      }
    }
  }




  Future<void> loadCourses() async {
    try {
      _setLoadingCourses(true);
      _clearError();
      
      if (kDebugMode) {
        debugPrint('🔄 Loading courses with enhanced storage...');
      }
      
      // First, try to load from enhanced local storage if cache is valid
      final isCacheValid = await _storage.isCacheValid('courses');
      if (isCacheValid) {
        final localCoursesData = await _storage.getCachedCourses();
        if (localCoursesData.isNotEmpty) {
          _courses = localCoursesData.map((data) => Course.fromJson(data)).toList();
          if (kDebugMode) {
            debugPrint('📱 Loaded ${_courses.length} courses from enhanced cache');
          }
          notifyListeners();
          _setLoadingCourses(false);
          
          // Subscribe to real-time updates for this course
          for (final course in _courses) {
            _realtime.subscribeToCourse(course.id);
          }
          
          return; // Exit early if we have valid cached data
        }
      }
      
      if (kDebugMode) {
        debugPrint('🔄 Cache invalid or empty, loading from database...');
      }
      
      // Load courses from Supabase database
      final dbCourses = await _supabaseService.getCourses();
      if (kDebugMode) {
        debugPrint('Loaded ${dbCourses.length} courses from database');
        for (var course in dbCourses) {
          if (course.imageUrlOrThumbnail != null) {
            debugPrint('📸 Course "${course.title}" has image: ${course.imageUrlOrThumbnail!.substring(0, 50)}...');
          } else {
            debugPrint('🚫 Course "${course.title}" has no image');
          }
        }
      }
      
      _courses = dbCourses;
      
      // Save to enhanced local storage
      final coursesData = dbCourses.map((course) => course.toJson()).toList();
      await _storage.cacheCourses(coursesData);
      
      // Subscribe to real-time updates for all courses
      for (final course in _courses) {
        _realtime.subscribeToCourse(course.id);
      }
      
      if (kDebugMode) {
        debugPrint('Total courses loaded: ${_courses.length}');
      }
      
      notifyListeners();
    } catch (e) {
      if (kDebugMode) {
        debugPrint('❌ Error loading courses: $e');
        debugPrint('🔄 Trying enhanced local cache as fallback...');
      }
      
      // Try enhanced local cache as fallback
      try {
        final localCoursesData = await _storage.getCachedCourses();
        if (localCoursesData.isNotEmpty) {
          _courses = localCoursesData.map((data) => Course.fromJson(data)).toList();
          if (kDebugMode) {
            debugPrint('📱 Using ${_courses.length} courses from enhanced cache as fallback');
          }
          notifyListeners();
          return;
        }
      } catch (cacheError) {
        if (kDebugMode) {
          debugPrint('❌ Enhanced cache also failed: $cacheError');
        }
      }
      
      // Final fallback
      _courses = [];
      if (kDebugMode) {
        debugPrint('📝 No courses available - using empty list');
      }
      _setError('Failed to load courses: ${e.toString()}');
      notifyListeners();
    } finally {
      _setLoadingCourses(false);
    }
  }

  Future<void> loadCourse(String courseId) async {
    try {
      _clearError();

      // 1) If already selected and matches, keep it
      if (_selectedCourse != null && _selectedCourse!.id == courseId) {
        if (kDebugMode) {
          debugPrint('✅ Using already selected course: ${_selectedCourse!.title}');
        }
        // refresh enrollment state in background
        unawaited(_refreshEnrollment(courseId));
        notifyListeners();
        return;
      }

      // 2) Try to find in already loaded courses list
      try {
        final existing = _courses.firstWhere((c) => c.id == courseId);
        _selectedCourse = existing;
        if (kDebugMode) {
          debugPrint('✅ Found course in memory: ${existing.title}');
        }
        unawaited(_refreshEnrollment(courseId));
        notifyListeners();
        return;
      } catch (_) {}

      // 3) Try enhanced local cache
      try {
        final localCoursesData = await _storage.getCachedCourses();
        final fromLocal = localCoursesData
            .where((c) => c['id'] == courseId)
            .map((data) => Course.fromJson(data))
            .firstOrNull;
        if (fromLocal != null) {
          _selectedCourse = fromLocal;
          if (kDebugMode) {
            debugPrint('✅ Loaded course from enhanced cache: ${fromLocal.title}');
          }
          unawaited(_refreshEnrollment(courseId));
          notifyListeners();
          return;
        }
      } catch (cacheError) {
        if (kDebugMode) {
          debugPrint('⚠️ Failed reading enhanced cache for course: $cacheError');
        }
      }

      // 4) Fetch from database
      try {
        final dbCourse = await _supabaseService.getCourseById(courseId);
        _selectedCourse = dbCourse;
        // Load enrollment state in background
        unawaited(_refreshEnrollment(courseId));
        if (kDebugMode) {
          debugPrint('✅ Loaded course from database: ${dbCourse.title}');
        }
        notifyListeners();
        return;
      } catch (dbError) {
        if (kDebugMode) {
          debugPrint('⚠️ Database load failed for course $courseId: $dbError');
        }
      }

      // 5) Final fallback: no course found
      _selectedCourse = null;
      if (kDebugMode) {
        debugPrint('📝 No course found for id=$courseId');
      }
      notifyListeners();
    } catch (e) {
      _setError('Failed to load course: ${e.toString()}');
    }
  }

  Future<void> _refreshEnrollment(String courseId) async {
    try {
      final purchased = await _supabaseService.hasEnrollment(courseId);
      _enrollmentCache[courseId] = purchased;
      notifyListeners();
    } catch (_) {}
  }

  Future<void> markPurchased(String courseId) async {
    _enrollmentCache[courseId] = true;
    notifyListeners();
  }

  Future<void> refreshEnrollmentForCourse(String courseId) async {
    await _refreshEnrollment(courseId);
  }

  Future<void> loadClasses(String courseId) async {
    try {
      _setLoadingClasses(true);
      _clearError();
      
      if (kDebugMode) {
        debugPrint('🔄 Loading classes for course: $courseId with enhanced storage...');
      }
      
      // First, try to load from enhanced local storage if cache is valid
      final isCacheValid = await _storage.isCacheValid('classes', courseId: courseId);
      if (isCacheValid) {
        final localClassesData = await _storage.getCachedClasses(courseId);
        if (localClassesData.isNotEmpty) {
          _classes = localClassesData.map((data) => Class.fromJson(data)).toList();
          if (kDebugMode) {
            debugPrint('📱 Loaded ${_classes.length} classes for course $courseId from enhanced cache');
          }
          notifyListeners();
          _setLoadingClasses(false);
          
          // Subscribe to real-time updates for this course's classes
          _realtime.subscribeToCourseClasses(courseId);
          
          return; // Exit early if we have valid cached data
        }
      }
      
      if (kDebugMode) {
        debugPrint('🔄 Cache invalid or empty, loading from database...');
      }
      
      // Load classes from Supabase database
      final dbClasses = await _supabaseService.getClassesByCourseId(courseId);
      if (kDebugMode) {
        debugPrint('✅ Loaded ${dbClasses.length} classes for course $courseId');
        for (var classItem in dbClasses) {
          debugPrint('📚 Class: ${classItem.title} (${classItem.durationMinutes}min)');
        }
      }
      
      _classes = dbClasses;
      
      // Save to enhanced local storage
      final classesData = dbClasses.map((classItem) => classItem.toJson()).toList();
      await _storage.cacheClasses(courseId, classesData);
      
      // Subscribe to real-time updates for this course's classes
      _realtime.subscribeToCourseClasses(courseId);
      
      if (kDebugMode) {
        debugPrint('Total classes loaded: ${_classes.length}');
      }
      
      notifyListeners();
    } catch (e) {
      if (kDebugMode) {
        debugPrint('❌ Error loading classes: $e');
        debugPrint('🔄 Trying enhanced local cache as fallback...');
      }
      
      // Try enhanced local cache as fallback
      try {
        final localClassesData = await _storage.getCachedClasses(courseId);
        if (localClassesData.isNotEmpty) {
          _classes = localClassesData.map((data) => Class.fromJson(data)).toList();
          if (kDebugMode) {
            debugPrint('📱 Using ${_classes.length} classes from enhanced cache as fallback');
          }
          notifyListeners();
          return;
        }
      } catch (cacheError) {
        if (kDebugMode) {
          debugPrint('❌ Enhanced cache also failed: $cacheError');
        }
      }
      
      // Final fallback
      _classes = [];
      if (kDebugMode) {
        debugPrint('📝 No classes available - using empty list');
      }
      _setError('Failed to load classes: ${e.toString()}');
      notifyListeners();
    } finally {
      _setLoadingClasses(false);
    }
  }

  // Clear local cache
  Future<void> clearCache() async {
    try {
      await _storage.clearCache();
      if (kDebugMode) {
        debugPrint('🗑️ Cleared all cached data');
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('❌ Failed to clear cache: $e');
      }
    }
  }

  // Force refresh data from server (ignoring cache)
  Future<void> refreshData() async {
    if (kDebugMode) {
      debugPrint('🔄 Force refreshing data from server...');
    }
    await clearCache();
    await loadCourses();
    await loadAllClasses();
  }

  // Load all classes for all courses
  Future<void> loadAllClasses() async {
    try {
      _setLoadingClasses(true);
      _clearError();
      
      // Load all classes from Supabase database
      final allClasses = await _supabaseService.getAllClasses();
      if (kDebugMode) {
        debugPrint('Loaded ${allClasses.length} total classes');
      }
      
      _classes = allClasses;
      notifyListeners();
    } catch (e) {
      if (kDebugMode) {
        debugPrint('Database error loading all classes: $e');
      }
      _setError('Failed to load classes: ${e.toString()}');
    } finally {
      _setLoadingClasses(false);
    }
  }

  Future<void> loadClass(String classId) async {
    try {
      _clearError();
      
      if (kDebugMode) {
        debugPrint('🔄 Loading class with ID: $classId');
      }
      
      // First try to find class in already loaded classes
      final existingClass = _classes.where((c) => c.id == classId).firstOrNull;
      if (existingClass != null) {
        _selectedClass = existingClass;
        if (kDebugMode) {
          debugPrint('✅ Found class in cache: ${existingClass.title}');
          debugPrint('🎬 Video URL: ${existingClass.videoUrl.length > 100 ? "${existingClass.videoUrl.substring(0, 100)}..." : existingClass.videoUrl}');
        }
        notifyListeners();
        return;
      }
      
      // If not found in cache, try to load from database
      try {
        final dbClass = await _supabaseService.getClassById(classId);
        _selectedClass = dbClass;
        if (kDebugMode) {
          debugPrint('✅ Loaded class from database: ${dbClass.title}');
          debugPrint('🎬 Video URL: ${dbClass.videoUrl.length > 100 ? "${dbClass.videoUrl.substring(0, 100)}..." : dbClass.videoUrl}');
        }
        notifyListeners();
        return;
      } catch (e) {
        if (kDebugMode) {
          debugPrint('⚠️ Failed to load from database: $e');
        }
      }
      
      // No class found
      _selectedClass = null;
      if (kDebugMode) {
        debugPrint('📝 No class found for id: $classId');
      }
      notifyListeners();
    } catch (e) {
      if (kDebugMode) {
        debugPrint('❌ Error loading class: $e');
      }
      _setError('Failed to load class: ${e.toString()}');
    }
  }

  void selectCourse(Course course) {
    _selectedCourse = course;
    unawaited(_refreshEnrollment(course.id));
    notifyListeners();
  }

  void selectClass(Class classItem) {
    _selectedClass = classItem;
    notifyListeners();
  }

  void clearSelectedCourse() {
    _selectedCourse = null;
    _classes = [];
    notifyListeners();
  }

  void clearSelectedClass() {
    _selectedClass = null;
    notifyListeners();
  }

  // Dispose resources
  @override
  void dispose() {
    _courseUpdatesSubscription?.cancel();
    _classUpdatesSubscription?.cancel();
    _syncStatusSubscription?.cancel();
    super.dispose();
  }

  void _setLoadingCourses(bool loading) {
    _isLoadingCourses = loading;
    notifyListeners();
  }

  void _setLoadingClasses(bool loading) {
    _isLoadingClasses = loading;
    notifyListeners();
  }

  void _setError(String error) {
    _errorMessage = error;
    notifyListeners();
  }

  void _clearError() {
    _errorMessage = null;
    notifyListeners();
  }

  void clearError() {
    _clearError();
  }

  // Refresh classes for the current course
  Future<void> refreshClasses() async {
    if (_selectedCourse != null) {
      await loadClasses(_selectedCourse!.id);
    } else {
      await loadAllClasses();
    }
  }
}


