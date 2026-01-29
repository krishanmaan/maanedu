import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

class EnhancedStorageService {
  static EnhancedStorageService? _instance;
  static EnhancedStorageService get instance => _instance ??= EnhancedStorageService._();
  
  EnhancedStorageService._();
  
  SharedPreferences? _prefs;
  
  // Cache configuration
  static const int _maxCacheSize = 50 * 1024 * 1024; // 50MB
  static const int _cacheExpiryHours = 24;
  static const int _compressionThreshold = 1024; // 1KB
  
  // Storage keys
  static const String _coursesKey = 'cached_courses_v2';
  static const String _classesKey = 'cached_classes_v2';
  static const String _lastUpdatedKey = 'last_updated_v2';
  static const String _cacheMetadataKey = 'cache_metadata_v2';
  static const String _offlineQueueKey = 'offline_queue_v2';
  
  Future<void> initialize() async {
    _prefs = await SharedPreferences.getInstance();
    
    // Clean up old cache on initialization
    await _cleanupOldCache();
  }
  
  // Enhanced course caching with compression
  Future<void> cacheCourses(List<dynamic> courses) async {
    try {
      final jsonString = jsonEncode(courses);
      final compressed = await _compressData(jsonString);
      final metadata = _generateCacheMetadata('courses', compressed.length);
      
      await _prefs?.setString(_coursesKey, compressed);
      await _prefs?.setString(_cacheMetadataKey, jsonEncode(metadata));
      await _prefs?.setString(_lastUpdatedKey, DateTime.now().toIso8601String());
      
      if (kDebugMode) {
        debugPrint('💾 Cached ${courses.length} courses (${_formatBytes(compressed.length)})');
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('❌ Error caching courses: $e');
      }
    }
  }
  
  Future<List<dynamic>> getCachedCourses() async {
    try {
      final compressed = _prefs?.getString(_coursesKey);
      if (compressed == null) return [];
      
      final decompressed = await _decompressData(compressed);
      final courses = jsonDecode(decompressed) as List;
      
      if (kDebugMode) {
        debugPrint('📱 Retrieved ${courses.length} courses from cache');
      }
      
      return courses;
    } catch (e) {
      if (kDebugMode) {
        debugPrint('❌ Error retrieving cached courses: $e');
      }
      return [];
    }
  }
  
  // Enhanced class caching with course-specific storage
  Future<void> cacheClasses(String courseId, List<dynamic> classes) async {
    try {
      final jsonString = jsonEncode(classes);
      final compressed = await _compressData(jsonString);
      final key = '${_classesKey}_$courseId';
      final metadata = _generateCacheMetadata('classes_$courseId', compressed.length);
      
      await _prefs?.setString(key, compressed);
      await _prefs?.setString('${_cacheMetadataKey}_$courseId', jsonEncode(metadata));
      
      if (kDebugMode) {
        debugPrint('💾 Cached ${classes.length} classes for course $courseId (${_formatBytes(compressed.length)})');
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('❌ Error caching classes: $e');
      }
    }
  }
  
  Future<List<dynamic>> getCachedClasses(String courseId) async {
    try {
      final key = '${_classesKey}_$courseId';
      final compressed = _prefs?.getString(key);
      if (compressed == null) return [];
      
      final decompressed = await _decompressData(compressed);
      final classes = jsonDecode(decompressed) as List;
      
      if (kDebugMode) {
        debugPrint('📱 Retrieved ${classes.length} classes for course $courseId from cache');
      }
      
      return classes;
    } catch (e) {
      if (kDebugMode) {
        debugPrint('❌ Error retrieving cached classes: $e');
      }
      return [];
    }
  }
  
  // Cache validation with metadata
  Future<bool> isCacheValid(String type, {String? courseId}) async {
    try {
      final key = courseId != null ? '${_cacheMetadataKey}_$courseId' : _cacheMetadataKey;
      final metadataString = _prefs?.getString(key);
      
      if (metadataString == null) return false;
      
      final metadata = jsonDecode(metadataString) as Map<String, dynamic>;
      final cacheTime = DateTime.parse(metadata['timestamp']);
      final expiryTime = cacheTime.add(Duration(hours: _cacheExpiryHours));
      
      final isValid = DateTime.now().isBefore(expiryTime);
      
      if (kDebugMode) {
        debugPrint('🔍 Cache validation for $type${courseId != null ? '_$courseId' : ''}: ${isValid ? '✅ Valid' : '❌ Expired'}');
      }
      
      return isValid;
    } catch (e) {
      if (kDebugMode) {
        debugPrint('❌ Error validating cache: $e');
      }
      return false;
    }
  }
  
  // Offline operation queue
  Future<void> queueOfflineOperation(String operation, Map<String, dynamic> data) async {
    try {
      final queue = await getOfflineQueue();
      queue.add({
        'id': _generateOperationId(),
        'operation': operation,
        'data': data,
        'timestamp': DateTime.now().toIso8601String(),
        'retryCount': 0,
      });
      
      await _prefs?.setString(_offlineQueueKey, jsonEncode(queue));
      
      if (kDebugMode) {
        debugPrint('📝 Queued offline operation: $operation');
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('❌ Error queuing offline operation: $e');
      }
    }
  }
  
  Future<List<Map<String, dynamic>>> getOfflineQueue() async {
    try {
      final queueString = _prefs?.getString(_offlineQueueKey);
      if (queueString == null) return [];
      
      return List<Map<String, dynamic>>.from(jsonDecode(queueString));
    } catch (e) {
      if (kDebugMode) {
        debugPrint('❌ Error getting offline queue: $e');
      }
      return [];
    }
  }
  
  Future<void> clearOfflineQueue() async {
    await _prefs?.remove(_offlineQueueKey);
  }
  
  // Cache management
  Future<void> clearCache() async {
    try {
      final keys = _prefs?.getKeys().where((key) => 
        key.startsWith(_coursesKey) || 
        key.startsWith(_classesKey) || 
        key.startsWith(_cacheMetadataKey) ||
        key == _lastUpdatedKey
      ).toList() ?? [];
      
      for (final key in keys) {
        await _prefs?.remove(key);
      }
      
      if (kDebugMode) {
        debugPrint('🗑️ Cleared all cache data');
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('❌ Error clearing cache: $e');
      }
    }
  }
  
  Future<int> getCacheSize() async {
    try {
      int totalSize = 0;
      final keys = _prefs?.getKeys().where((key) => 
        key.startsWith(_coursesKey) || 
        key.startsWith(_classesKey)
      ).toList() ?? [];
      
      for (final key in keys) {
        final value = _prefs?.getString(key);
        if (value != null) {
          totalSize += value.length;
        }
      }
      
      return totalSize;
    } catch (e) {
      if (kDebugMode) {
        debugPrint('❌ Error calculating cache size: $e');
      }
      return 0;
    }
  }
  
  // Data compression/decompression
  Future<String> _compressData(String data) async {
    if (data.length < _compressionThreshold) {
      return data; // Don't compress small data
    }
    
    try {
      // Simple compression using gzip (you can use a more advanced compression library)
      final bytes = utf8.encode(data);
      final compressed = gzip.encode(bytes);
      return base64Encode(compressed);
    } catch (e) {
      if (kDebugMode) {
        debugPrint('❌ Compression failed, using original data: $e');
      }
      return data;
    }
  }
  
  Future<String> _decompressData(String compressedData) async {
    try {
      // Check if data is compressed (base64 encoded)
      if (compressedData.length < _compressionThreshold || !_isBase64(compressedData)) {
        return compressedData; // Not compressed
      }
      
      final bytes = base64Decode(compressedData);
      final decompressed = gzip.decode(bytes);
      return utf8.decode(decompressed);
    } catch (e) {
      if (kDebugMode) {
        debugPrint('❌ Decompression failed, using original data: $e');
      }
      return compressedData;
    }
  }
  
  bool _isBase64(String str) {
    try {
      base64Decode(str);
      return true;
    } catch (e) {
      return false;
    }
  }
  
  // Utility methods
  Map<String, dynamic> _generateCacheMetadata(String type, int size) {
    return {
      'type': type,
      'timestamp': DateTime.now().toIso8601String(),
      'size': size,
      'version': '2.0',
    };
  }
  
  String _generateOperationId() {
    final timestamp = DateTime.now().millisecondsSinceEpoch;
    final random = (timestamp * 1000) % 10000;
    return '${timestamp}_$random';
  }
  
  String _formatBytes(int bytes) {
    if (bytes < 1024) return '$bytes B';
    if (bytes < 1024 * 1024) return '${(bytes / 1024).toStringAsFixed(1)} KB';
    return '${(bytes / (1024 * 1024)).toStringAsFixed(1)} MB';
  }
  
  Future<void> _cleanupOldCache() async {
    try {
      final cacheSize = await getCacheSize();
      if (cacheSize > _maxCacheSize) {
        if (kDebugMode) {
          debugPrint('🧹 Cache size (${_formatBytes(cacheSize)}) exceeds limit, cleaning up...');
        }
        await clearCache();
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('❌ Error during cache cleanup: $e');
      }
    }
  }
}
