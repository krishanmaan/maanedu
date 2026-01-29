import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/course.dart';
import '../models/class.dart';

class LocalStorageService {
  static LocalStorageService? _instance;
  static LocalStorageService get instance => _instance ??= LocalStorageService._();
  
  LocalStorageService._();

  // Storage keys
  static const String _coursesKey = 'cached_courses';
  static const String _classesKey = 'cached_classes';
  static const String _lastUpdatedKey = 'last_updated';
  static const String _cacheExpiryKey = 'cache_expiry_hours';

  // Cache expiry time in hours (default: 24 hours)
  static const int _defaultCacheExpiryHours = 24;

  // Save courses to local storage
  Future<void> saveCourses(List<Course> courses) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final coursesJson = courses.map((course) => course.toJson()).toList();
      await prefs.setString(_coursesKey, jsonEncode(coursesJson));
      await prefs.setInt(_lastUpdatedKey, DateTime.now().millisecondsSinceEpoch);
      if (kDebugMode) {
        debugPrint('💾 Saved ${courses.length} courses to local storage');
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('❌ Failed to save courses to local storage: $e');
      }
    }
  }

  // Load courses from local storage
  Future<List<Course>> loadCourses() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final coursesJson = prefs.getString(_coursesKey);
      
      if (coursesJson != null) {
        final List<dynamic> coursesList = jsonDecode(coursesJson);
        final courses = coursesList.map((json) => Course.fromJson(json)).toList();
        
        if (kDebugMode) {
          debugPrint('📱 Loaded ${courses.length} courses from local storage');
        }
        
        return courses;
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('❌ Failed to load courses from local storage: $e');
      }
    }
    
    return [];
  }

  // Save classes to local storage
  Future<void> saveClasses(List<Class> classes) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final classesJson = classes.map((classItem) => classItem.toJson()).toList();
      await prefs.setString(_classesKey, jsonEncode(classesJson));
      if (kDebugMode) {
        debugPrint('💾 Saved ${classes.length} classes to local storage');
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('❌ Failed to save classes to local storage: $e');
      }
    }
  }

  // Load classes from local storage
  Future<List<Class>> loadClasses() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final classesJson = prefs.getString(_classesKey);
      
      if (classesJson != null) {
        final List<dynamic> classesList = jsonDecode(classesJson);
        final classes = classesList.map((json) => Class.fromJson(json)).toList();
        
        if (kDebugMode) {
          debugPrint('📱 Loaded ${classes.length} classes from local storage');
        }
        
        return classes;
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('❌ Failed to load classes from local storage: $e');
      }
    }
    
    return [];
  }

  // Check if cache is still valid
  Future<bool> isCacheValid() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final lastUpdated = prefs.getInt(_lastUpdatedKey);
      
      if (lastUpdated == null) return false;
      
      final lastUpdatedTime = DateTime.fromMillisecondsSinceEpoch(lastUpdated);
      final now = DateTime.now();
      final difference = now.difference(lastUpdatedTime);
      
      // Check if cache is within expiry time
      final expiryHours = prefs.getInt(_cacheExpiryKey) ?? _defaultCacheExpiryHours;
      final isValid = difference.inHours < expiryHours;
      
      if (kDebugMode) {
        debugPrint('⏰ Cache validity check: ${difference.inHours}h old, expiry: ${expiryHours}h, valid: $isValid');
      }
      
      return isValid;
    } catch (e) {
      if (kDebugMode) {
        debugPrint('❌ Failed to check cache validity: $e');
      }
      return false;
    }
  }

  // Clear all cached data
  Future<void> clearCache() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_coursesKey);
      await prefs.remove(_classesKey);
      await prefs.remove(_lastUpdatedKey);
      if (kDebugMode) {
        debugPrint('🗑️ Cleared all cached data');
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('❌ Failed to clear cache: $e');
      }
    }
  }

  // Set custom cache expiry time
  Future<void> setCacheExpiry(int hours) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setInt(_cacheExpiryKey, hours);
      if (kDebugMode) {
        debugPrint('⏰ Set cache expiry to $hours hours');
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('❌ Failed to set cache expiry: $e');
      }
    }
  }

  // Get cache info
  Future<Map<String, dynamic>> getCacheInfo() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final lastUpdated = prefs.getInt(_lastUpdatedKey);
      final expiryHours = prefs.getInt(_cacheExpiryKey) ?? _defaultCacheExpiryHours;
      
      if (lastUpdated != null) {
        final lastUpdatedTime = DateTime.fromMillisecondsSinceEpoch(lastUpdated);
        final now = DateTime.now();
        final difference = now.difference(lastUpdatedTime);
        final isValid = difference.inHours < expiryHours;
        
        return {
          'lastUpdated': lastUpdatedTime,
          'age': difference,
          'expiryHours': expiryHours,
          'isValid': isValid,
        };
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('❌ Failed to get cache info: $e');
      }
    }
    
    return {};
  }
}
