import 'dart:async';
import 'dart:io';
import 'package:flutter/foundation.dart';
import '../services/enhanced_storage_service.dart';
import '../services/supabase_service.dart';

class SyncService {
  static SyncService? _instance;
  static SyncService get instance => _instance ??= SyncService._();
  
  SyncService._();
  
  final EnhancedStorageService _storage = EnhancedStorageService.instance;
  final SupabaseService _supabase = SupabaseService.instance;
  
  Timer? _syncTimer;
  
  bool _isOnline = true;
  bool _isSyncing = false;
  
  // Sync configuration
  static const Duration _syncInterval = Duration(minutes: 5);
  static const int _maxRetryAttempts = 3;
  
  // Stream controllers
  final StreamController<bool> _syncStatusController = StreamController<bool>.broadcast();
  final StreamController<String> _syncProgressController = StreamController<String>.broadcast();
  
  // Getters
  bool get isOnline => _isOnline;
  bool get isSyncing => _isSyncing;
  Stream<bool> get syncStatusStream => _syncStatusController.stream;
  Stream<String> get syncProgressStream => _syncProgressController.stream;
  
  // Initialize sync service
  Future<void> initialize() async {
    try {
      if (kDebugMode) {
        debugPrint('🔄 Initializing sync service...');
      }
      
      // Check initial connectivity
      await _checkConnectivity();
      
      // Start periodic sync
      _startPeriodicSync();
      
      // Process offline queue if online
      if (_isOnline) {
        await _processOfflineQueue();
      }
      
      if (kDebugMode) {
        debugPrint('✅ Sync service initialized');
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('❌ Error initializing sync service: $e');
      }
    }
  }
  
  // Check network connectivity
  Future<void> _checkConnectivity() async {
    try {
      final result = await InternetAddress.lookup('google.com');
      _isOnline = result.isNotEmpty && result[0].rawAddress.isNotEmpty;
      
      if (kDebugMode) {
        debugPrint('🌐 Connectivity status: ${_isOnline ? 'Online' : 'Offline'}');
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('❌ Error checking connectivity: $e');
      }
      _isOnline = false;
    }
  }
  
  // Start periodic sync
  void _startPeriodicSync() {
    _syncTimer = Timer.periodic(_syncInterval, (timer) {
      if (_isOnline && !_isSyncing) {
        _performBackgroundSync();
      }
    });
  }
  
  // Perform background sync
  Future<void> _performBackgroundSync() async {
    try {
      if (kDebugMode) {
        debugPrint('🔄 Starting background sync...');
      }
      
      _isSyncing = true;
      _syncStatusController.add(true);
      
      // Sync courses
      await _syncCourses();
      
      // Sync classes for all courses
      await _syncAllClasses();
      
      // Process offline queue
      await _processOfflineQueue();
      
      if (kDebugMode) {
        debugPrint('✅ Background sync completed');
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('❌ Background sync error: $e');
      }
    } finally {
      _isSyncing = false;
      _syncStatusController.add(false);
    }
  }
  
  // Sync courses
  Future<void> _syncCourses() async {
    try {
      _syncProgressController.add('Syncing courses...');
      
      final courses = await _supabase.getCourses();
      await _storage.cacheCourses(courses);
      
      if (kDebugMode) {
        debugPrint('✅ Synced ${courses.length} courses');
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('❌ Error syncing courses: $e');
      }
    }
  }
  
  // Sync all classes
  Future<void> _syncAllClasses() async {
    try {
      _syncProgressController.add('Syncing classes...');
      
      final courses = await _storage.getCachedCourses();
      for (final course in courses) {
        try {
          final courseId = course['id'] as String;
          final classes = await _supabase.getClassesByCourseId(courseId);
          await _storage.cacheClasses(courseId, classes);
          
          if (kDebugMode) {
            debugPrint('✅ Synced ${classes.length} classes for course $courseId');
          }
        } catch (e) {
          if (kDebugMode) {
            debugPrint('❌ Error syncing classes for course ${course['id']}: $e');
          }
        }
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('❌ Error syncing all classes: $e');
      }
    }
  }
  
  // Process offline queue
  Future<void> _processOfflineQueue() async {
    try {
      if (!_isOnline) return;
      
      final queue = await _storage.getOfflineQueue();
      if (queue.isEmpty) return;
      
      _syncProgressController.add('Processing offline operations...');
      
      final List<Map<String, dynamic>> failedOperations = [];
      
      for (final operation in queue) {
        try {
          final success = await _executeOfflineOperation(operation);
          if (!success) {
            operation['retryCount'] = (operation['retryCount'] as int) + 1;
            if (operation['retryCount'] < _maxRetryAttempts) {
              failedOperations.add(operation);
            }
          }
        } catch (e) {
          if (kDebugMode) {
            debugPrint('❌ Error executing offline operation: $e');
          }
          operation['retryCount'] = (operation['retryCount'] as int) + 1;
          if (operation['retryCount'] < _maxRetryAttempts) {
            failedOperations.add(operation);
          }
        }
      }
      
      // Update queue with failed operations
      await _storage.queueOfflineOperation('update_queue', {'queue': failedOperations});
      
      if (kDebugMode) {
        debugPrint('✅ Processed ${queue.length - failedOperations.length} offline operations');
        if (failedOperations.isNotEmpty) {
          debugPrint('⚠️ ${failedOperations.length} operations failed and will be retried');
        }
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('❌ Error processing offline queue: $e');
      }
    }
  }
  
  // Execute offline operation
  Future<bool> _executeOfflineOperation(Map<String, dynamic> operation) async {
    try {
      final operationType = operation['operation'] as String;
      final data = operation['data'] as Map<String, dynamic>;
      
      switch (operationType) {
        case 'increment_views':
          await _supabase.incrementClassViews(data['classId'] as String);
          break;
          
        case 'update_user_profile':
          await _supabase.updateUserProfile(
            name: data['name'] as String?,
            avatar: data['avatar'] as String?,
          );
          break;
          
        default:
          if (kDebugMode) {
            debugPrint('⚠️ Unknown offline operation: $operationType');
          }
          return false;
      }
      
      return true;
    } catch (e) {
      if (kDebugMode) {
        debugPrint('❌ Error executing operation ${operation['operation']}: $e');
      }
      return false;
    }
  }
  
  // Force sync
  Future<void> forceSync() async {
    if (!_isOnline) {
      if (kDebugMode) {
        debugPrint('⚠️ Cannot sync while offline');
      }
      return;
    }
    
    await _performBackgroundSync();
  }
  
  // Queue operation for offline execution
  Future<void> queueOperation(String operation, Map<String, dynamic> data) async {
    if (_isOnline) {
      // Try to execute immediately
      try {
        final success = await _executeOfflineOperation({
          'operation': operation,
          'data': data,
          'retryCount': 0,
        });
        
        if (success) {
          if (kDebugMode) {
            debugPrint('✅ Executed operation $operation immediately');
          }
          return;
        }
      } catch (e) {
        if (kDebugMode) {
          debugPrint('❌ Immediate execution failed, queuing: $e');
        }
      }
    }
    
    // Queue for later execution
    await _storage.queueOfflineOperation(operation, data);
  }
  
  // Get sync statistics
  Future<Map<String, dynamic>> getSyncStats() async {
    try {
      final cacheSize = await _storage.getCacheSize();
      final queue = await _storage.getOfflineQueue();
      final isCacheValid = await _storage.isCacheValid('courses');
      
      return {
        'isOnline': _isOnline,
        'isSyncing': _isSyncing,
        'cacheSize': cacheSize,
        'pendingOperations': queue.length,
        'cacheValid': isCacheValid,
        'lastSync': DateTime.now().toIso8601String(),
      };
    } catch (e) {
      if (kDebugMode) {
        debugPrint('❌ Error getting sync stats: $e');
      }
      return {};
    }
  }
  
  // Dispose resources
  Future<void> dispose() async {
    try {
      _syncTimer?.cancel();
      await _syncStatusController.close();
      await _syncProgressController.close();
      
      if (kDebugMode) {
        debugPrint('🗑️ Sync service disposed');
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('❌ Error disposing sync service: $e');
      }
    }
  }
}
