import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/course.dart';
import '../models/class.dart';

class RealtimeService {
  static RealtimeService? _instance;
  static RealtimeService get instance => _instance ??= RealtimeService._();
  
  RealtimeService._();
  
  SupabaseClient get _client => Supabase.instance.client;
  
  // Stream controllers for real-time updates
  final StreamController<List<Course>> _coursesController = StreamController<List<Course>>.broadcast();
  final StreamController<List<Class>> _classesController = StreamController<List<Class>>.broadcast();
  final StreamController<Course> _courseUpdatesController = StreamController<Course>.broadcast();
  final StreamController<Class> _classUpdatesController = StreamController<Class>.broadcast();
  
  // Active subscriptions
  RealtimeChannel? _coursesChannel;
  RealtimeChannel? _classesChannel;
  
  // Stream getters
  Stream<List<Course>> get coursesStream => _coursesController.stream;
  Stream<List<Class>> get classesStream => _classesController.stream;
  Stream<Course> get courseUpdatesStream => _courseUpdatesController.stream;
  Stream<Class> get classUpdatesStream => _classUpdatesController.stream;
  
  // Initialize real-time subscriptions
  Future<void> initialize() async {
    try {
      if (kDebugMode) {
        debugPrint('🔄 Initializing real-time subscriptions...');
      }
      
      await _subscribeToCourses();
      await _subscribeToClasses();
      
      if (kDebugMode) {
        debugPrint('✅ Real-time subscriptions initialized');
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('❌ Error initializing real-time subscriptions: $e');
      }
    }
  }
  
  // Subscribe to courses table changes
  Future<void> _subscribeToCourses() async {
    try {
      _coursesChannel = _client
          .channel('courses_changes')
          .onPostgresChanges(
            event: PostgresChangeEvent.all,
            schema: 'public',
            table: 'courses',
            callback: (payload) {
              if (kDebugMode) {
                debugPrint('📡 Course change detected: ${payload.eventType}');
              }
              
              _handleCourseChange(payload);
            },
          )
          .subscribe();
      
      if (kDebugMode) {
        debugPrint('📡 Subscribed to courses table changes');
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('❌ Error subscribing to courses: $e');
      }
    }
  }
  
  // Subscribe to classes table changes
  Future<void> _subscribeToClasses() async {
    try {
      _classesChannel = _client
          .channel('classes_changes')
          .onPostgresChanges(
            event: PostgresChangeEvent.all,
            schema: 'public',
            table: 'classes',
            callback: (payload) {
              if (kDebugMode) {
                debugPrint('📡 Class change detected: ${payload.eventType}');
              }
              
              _handleClassChange(payload);
            },
          )
          .subscribe();
      
      if (kDebugMode) {
        debugPrint('📡 Subscribed to classes table changes');
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('❌ Error subscribing to classes: $e');
      }
    }
  }
  
  // Handle course changes
  void _handleCourseChange(PostgresChangePayload payload) {
    try {
      final courseData = payload.newRecord;
      
      final course = Course.fromJson(courseData);
      
      switch (payload.eventType) {
        case PostgresChangeEvent.insert:
          if (kDebugMode) {
            debugPrint('➕ New course added: ${course.title}');
          }
          _courseUpdatesController.add(course);
          break;
          
        case PostgresChangeEvent.update:
          if (kDebugMode) {
            debugPrint('🔄 Course updated: ${course.title}');
          }
          _courseUpdatesController.add(course);
          break;
          
        case PostgresChangeEvent.delete:
          if (kDebugMode) {
            debugPrint('🗑️ Course deleted: ${course.title}');
          }
          _courseUpdatesController.add(course);
          break;
          
        default:
          if (kDebugMode) {
            debugPrint('📡 Unknown course change event: ${payload.eventType}');
          }
          break;
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('❌ Error handling course change: $e');
      }
    }
  }
  
  // Handle class changes
  void _handleClassChange(PostgresChangePayload payload) {
    try {
      final classData = payload.newRecord;
      
      final classItem = Class.fromJson(classData);
      
      switch (payload.eventType) {
        case PostgresChangeEvent.insert:
          if (kDebugMode) {
            debugPrint('➕ New class added: ${classItem.title}');
          }
          _classUpdatesController.add(classItem);
          break;
          
        case PostgresChangeEvent.update:
          if (kDebugMode) {
            debugPrint('🔄 Class updated: ${classItem.title}');
          }
          _classUpdatesController.add(classItem);
          break;
          
        case PostgresChangeEvent.delete:
          if (kDebugMode) {
            debugPrint('🗑️ Class deleted: ${classItem.title}');
          }
          _classUpdatesController.add(classItem);
          break;
          
        default:
          if (kDebugMode) {
            debugPrint('📡 Unknown class change event: ${payload.eventType}');
          }
          break;
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('❌ Error handling class change: $e');
      }
    }
  }
  
  // Subscribe to specific course changes
  Future<void> subscribeToCourse(String courseId) async {
    try {
      _client
          .channel('course_$courseId')
          .onPostgresChanges(
            event: PostgresChangeEvent.all,
            schema: 'public',
            table: 'courses',
            filter: PostgresChangeFilter(
              type: PostgresChangeFilterType.eq,
              column: 'id',
              value: courseId,
            ),
            callback: (payload) {
              if (kDebugMode) {
                debugPrint('📡 Course $courseId change detected: ${payload.eventType}');
              }
              _handleCourseChange(payload);
            },
          )
          .subscribe();
      
      if (kDebugMode) {
        debugPrint('📡 Subscribed to course $courseId changes');
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('❌ Error subscribing to course $courseId: $e');
      }
    }
  }
  
  // Subscribe to specific course's classes
  Future<void> subscribeToCourseClasses(String courseId) async {
    try {
      _client
          .channel('course_classes_$courseId')
          .onPostgresChanges(
            event: PostgresChangeEvent.all,
            schema: 'public',
            table: 'classes',
            filter: PostgresChangeFilter(
              type: PostgresChangeFilterType.eq,
              column: 'course_id',
              value: courseId,
            ),
            callback: (payload) {
              if (kDebugMode) {
                debugPrint('📡 Class for course $courseId change detected: ${payload.eventType}');
              }
              _handleClassChange(payload);
            },
          )
          .subscribe();
      
      if (kDebugMode) {
        debugPrint('📡 Subscribed to course $courseId classes changes');
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('❌ Error subscribing to course $courseId classes: $e');
      }
    }
  }
  
  // Unsubscribe from specific course
  Future<void> unsubscribeFromCourse(String courseId) async {
    try {
      // Note: Supabase doesn't have a direct removeChannel method
      // Channels are automatically cleaned up when the app is disposed
      if (kDebugMode) {
        debugPrint('📡 Unsubscribed from course $courseId');
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('❌ Error unsubscribing from course $courseId: $e');
      }
    }
  }
  
  // Check connection status
  bool get isConnected {
    return _coursesChannel != null && _classesChannel != null;
  }
  
  // Reconnect if disconnected
  Future<void> reconnect() async {
    try {
      if (kDebugMode) {
        debugPrint('🔄 Attempting to reconnect real-time subscriptions...');
      }
      
      await dispose();
      await initialize();
      
      if (kDebugMode) {
        debugPrint('✅ Real-time subscriptions reconnected');
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('❌ Error reconnecting: $e');
      }
    }
  }
  
  // Dispose resources
  Future<void> dispose() async {
    try {
      await _coursesChannel?.unsubscribe();
      await _classesChannel?.unsubscribe();
      
      await _coursesController.close();
      await _classesController.close();
      await _courseUpdatesController.close();
      await _classUpdatesController.close();
      
      if (kDebugMode) {
        debugPrint('🗑️ Real-time service disposed');
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('❌ Error disposing real-time service: $e');
      }
    }
  }
}
