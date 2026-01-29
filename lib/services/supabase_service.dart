import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'dart:io';
import '../models/course.dart';
import '../models/class.dart';
import '../models/user.dart';
import '../models/banner.dart';
import '../utils/constants.dart';

class SupabaseService {
  static SupabaseService? _instance;
  static SupabaseService get instance => _instance ??= SupabaseService._();
  
  SupabaseService._();

  SupabaseClient get client => Supabase.instance.client;

  // Check network connectivity
  Future<bool> _checkNetworkConnectivity() async {
    try {
      final result = await InternetAddress.lookup('google.com');
      return result.isNotEmpty && result[0].rawAddress.isNotEmpty;
    } on SocketException catch (_) {
      return false;
    }
  }

  // Initialize Supabase
  static Future<void> initialize() async {
    await Supabase.initialize(
      url: AppConstants.supabaseUrl,
      anonKey: AppConstants.supabaseAnonKey,
    );
  }

  // Authentication Methods
  Future<AuthResponse> signUp({
    required String email,
    required String password,
    String? name,
  }) async {
    try {
      final response = await client.auth.signUp(
        email: email,
        password: password,
        data: name != null ? {'name': name} : null,
      );
      
      // If signup is successful and user is created, insert into users table
      if (response.user != null) {
        try {
          await client.from('users').insert({
            'id': response.user!.id,
            'email': email,
            'name': name ?? '',
            'created_at': DateTime.now().toIso8601String(),
            'updated_at': DateTime.now().toIso8601String(),
          });
        } catch (e) {
          // If users table insert fails, log the error but don't fail the signup
          debugPrint('Failed to insert user into users table: $e');
        }
      }
      
      return response;
    } catch (e) {
      throw Exception('Sign up failed: $e');
    }
  }

  Future<AuthResponse> signIn({
    required String email,
    required String password,
  }) async {
    try {
      final response = await client.auth.signInWithPassword(
        email: email,
        password: password,
      );
      return response;
    } catch (e) {
      throw Exception('Sign in failed: $e');
    }
  }

  Future<void> signOut() async {
    try {
      await client.auth.signOut();
    } catch (e) {
      throw Exception('Sign out failed: $e');
    }
  }

  User? get currentUser => client.auth.currentUser;

  bool get isLoggedIn => currentUser != null;

  // Course Methods
  Future<List<Course>> getPurchasedCourses() async {
    try {
      final user = currentUser;
      if (user == null) {
        throw Exception('User not authenticated');
      }

      // Get purchased course ids for the current user
      final purchases = await client
          .from('purchases')
          .select('course_id')
          .eq('user_id', user.id)
          .eq('status', 'success');

      final List<dynamic> rawList = purchases as List<dynamic>;
      final List<String> courseIds = rawList
          .map((row) => (row['course_id'] as String?))
          .where((id) => id != null && id.isNotEmpty)
          .cast<String>()
          .toList();

      if (courseIds.isEmpty) {
        return [];
      }

      // Fetch courses by ids
      final coursesResp = await client
          .from('courses')
          .select()
          .inFilter('id', courseIds)
          .order('created_at', ascending: false);

      final List<dynamic> rawCourses = coursesResp as List<dynamic>;
      return rawCourses.map((c) => Course.fromJson(c)).toList();
    } catch (e) {
      if (kDebugMode) {
        debugPrint('❌ Failed to load purchased courses: $e');
      }
      rethrow;
    }
  }

  Future<List<Course>> getCourses() async {
    try {
      // Check network connectivity first
      final hasNetwork = await _checkNetworkConnectivity();
      if (!hasNetwork) {
        throw Exception('No internet connection available. Please check your network settings.');
      }
      
      if (kDebugMode) {
        debugPrint('🔍 Querying Supabase courses table...');
        debugPrint('🌐 Network connectivity: ✅');
      }
      
      final response = await client
          .from('courses')
          .select()
          .order('created_at', ascending: false);
      
      if (kDebugMode) {
        debugPrint('📡 Supabase raw response: $response');
        debugPrint('📡 Response type: ${response.runtimeType}');
        debugPrint('📡 Response length: ${response.length}');
      }
      
      if (response.isEmpty) {
        if (kDebugMode) {
          debugPrint('⚠️ No courses found in database');
        }
        return [];
      }
      
      final courses = (response as List)
          .map((course) {
            if (kDebugMode) {
              debugPrint('🔄 Converting course: $course');
            }
            return Course.fromJson(course);
          })
          .toList();
      
      if (kDebugMode) {
        debugPrint('✅ Successfully converted ${courses.length} courses');
      }
      
      return courses;
    } catch (e) {
      if (kDebugMode) {
        debugPrint('❌ Database error: $e');
      }
      rethrow;
    }
  }

  Future<Course> getCourseById(String courseId) async {
    try {
      final response = await client
          .from('courses')
          .select()
          .eq('id', courseId)
          .single();
      
      return Course.fromJson(response);
    } catch (e) {
      // If database error, return mock data
      if (kDebugMode) {
        debugPrint('Database error, using mock data for course: $e');
      }
      throw Exception('Course not found: $courseId');
    }
  }

  // Class Methods
  Future<List<Class>> getClassesByCourseId(String courseId) async {
    try {
      if (kDebugMode) {
        debugPrint('🔍 Querying classes for course: $courseId');
      }
      
      final response = await client
          .from('classes')
          .select()
          .eq('course_id', courseId)
          .order('order_index', ascending: true);
      
      if (kDebugMode) {
        debugPrint('📊 Supabase response: $response');
        debugPrint('📝 Response type: ${response.runtimeType}');
        debugPrint('📏 Response length: ${(response as List).length}');
      }
      
      if ((response as List).isEmpty) {
        if (kDebugMode) {
          debugPrint('⚠️ No classes found in database for course $courseId');
        }
        return [];
      }
      
      final classes = <Class>[];
      for (var classData in response) {
        try {
          if (kDebugMode) {
            debugPrint('🔄 Parsing class data: $classData');
            debugPrint('🔍 Field types:');
            debugPrint('  - duration_minutes: ${classData['duration_minutes']} (${classData['duration_minutes'].runtimeType})');
            debugPrint('  - order_index: ${classData['order_index']} (${classData['order_index'].runtimeType})');
            debugPrint('  - is_free: ${classData['is_free']} (${classData['is_free'].runtimeType})');
            debugPrint('  - views: ${classData['views']} (${classData['views'].runtimeType})');
          }
          
          final classObj = Class.fromJson(classData);
          classes.add(classObj);
          
          if (kDebugMode) {
            debugPrint('✅ Successfully parsed class: ${classObj.title}');
          }
        } catch (parseError) {
          if (kDebugMode) {
            debugPrint('❌ Error parsing class data: $parseError');
            debugPrint('📄 Problem data: $classData');
            debugPrint('🔍 Specific field analysis:');
            classData.forEach((key, value) {
              debugPrint('  $key: $value (${value.runtimeType})');
            });
          }
          // Skip this class but continue with others
          continue;
        }
      }
      
      if (kDebugMode) {
        debugPrint('✅ Successfully parsed ${classes.length} classes');
      }
      
      return classes;
    } catch (e) {
      // If database error, return mock data
      if (kDebugMode) {
        debugPrint('❌ Database error, using mock data for classes: $e');
      }
      return [];
    }
  }

  Future<Class> getClassById(String classId) async {
    try {
      final response = await client
          .from('classes')
          .select()
          .eq('id', classId)
          .single();
      
      return Class.fromJson(response);
    } catch (e) {
      // If database error, return mock data
      if (kDebugMode) {
        debugPrint('Database error, using mock data for class: $e');
      }
      throw Exception('Class not found: $classId');
    }
  }

  // Get all classes
  Future<List<Class>> getAllClasses() async {
    try {
      final response = await client
          .from('classes')
          .select()
          .order('created_at', ascending: false);
      
      if (kDebugMode) {
        debugPrint('Supabase classes response: $response');
      }
      
      if (response.isEmpty) {
        return [];
      }
      
      return (response as List)
          .map((classData) => Class.fromJson(classData))
          .toList();
    } catch (e) {
      if (kDebugMode) {
        debugPrint('Database error: $e');
      }
      rethrow;
    }
  }

  // User Profile Methods
  Future<AppUser?> getUserProfile() async {
    try {
      final user = currentUser;
      if (user == null) return null;

      // Try to get user data from users table first
      try {
        final response = await client
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();

        return AppUser(
          id: response['id'] as String,
          email: response['email'] as String,
          name: response['name'] as String?,
          avatar: response['avatar'] as String?,
          createdAt: DateTime.parse(response['created_at'] as String),
        );
      } catch (e) {
        // Fallback to auth user metadata if users table doesn't have the data
        debugPrint('Failed to get user from users table, using auth metadata: $e');
        return AppUser(
          id: user.id,
          email: user.email ?? '',
          name: user.userMetadata?['name'] as String?,
          avatar: user.userMetadata?['avatar'] as String?,
          createdAt: DateTime.parse(user.createdAt),
        );
      }
    } catch (e) {
      throw Exception('Failed to get user profile: $e');
    }
  }

  Future<void> updateUserProfile({
    String? name,
    String? avatar,
  }) async {
    try {
      final user = currentUser;
      if (user == null) throw Exception('User not authenticated');

      final updates = <String, dynamic>{};
      if (name != null) updates['name'] = name;
      if (avatar != null) updates['avatar'] = avatar;

      // Update auth user metadata
      if (updates.isNotEmpty) {
        await client.auth.updateUser(
          UserAttributes(data: updates),
        );
      }

      // Update users table
      try {
        final usersTableUpdates = <String, dynamic>{
          'updated_at': DateTime.now().toIso8601String(),
        };
        if (name != null) usersTableUpdates['name'] = name;
        if (avatar != null) usersTableUpdates['avatar'] = avatar;

        await client
            .from('users')
            .update(usersTableUpdates)
            .eq('id', user.id);
      } catch (e) {
        debugPrint('Failed to update users table: $e');
        // Don't throw error here as auth update was successful
      }
    } catch (e) {
      throw Exception('Failed to update profile: $e');
    }
  }

  // Upload profile picture to Supabase Storage
  Future<String> uploadProfilePicture(File imageFile, String userId) async {
    try {
      final fileExtension = imageFile.path.split('.').last;
      final fileName = 'profile_$userId.$fileExtension';
      final filePath = 'profile-pictures/$fileName';

      // Upload file to Supabase Storage
      await client.storage
          .from('avatars')
          .uploadBinary(
            filePath,
            await imageFile.readAsBytes(),
            fileOptions: const FileOptions(
              cacheControl: '3600',
              upsert: true, // This will overwrite existing file
            ),
          );

      // Get public URL
      final publicUrl = client.storage
          .from('avatars')
          .getPublicUrl(filePath);

      return publicUrl;
    } catch (e) {
      throw Exception('Failed to upload profile picture: $e');
    }
  }

  // Upload profile picture from bytes (for image picker)
  Future<String> uploadProfilePictureFromBytes(Uint8List imageBytes, String userId, String fileExtension) async {
    try {
      final fileName = 'profile_$userId.$fileExtension';
      final filePath = 'profile-pictures/$fileName';

      debugPrint('📤 Uploading to path: $filePath');
      debugPrint('📦 Bucket: avatars');
      debugPrint('👤 User ID: $userId');

      // Check if avatars bucket exists
      try {
        final buckets = await client.storage.listBuckets();
        final avatarsBucket = buckets.where((bucket) => bucket.name == 'avatars').toList();
        
        if (avatarsBucket.isEmpty) {
          debugPrint('❌ Avatars bucket does not exist. Available buckets: ${buckets.map((b) => b.name).toList()}');
          throw Exception('Avatars storage bucket does not exist. Please create it in Supabase Storage.');
        } else {
          debugPrint('✅ Avatars bucket found');
        }
      } catch (e) {
        debugPrint('❌ Error checking buckets: $e');
        throw Exception('Cannot access storage buckets: $e');
      }

      // Upload file to Supabase Storage
      final uploadResult = await client.storage
          .from('avatars')
          .uploadBinary(
            filePath,
            imageBytes,
            fileOptions: const FileOptions(
              cacheControl: '3600',
              upsert: true, // This will overwrite existing file
            ),
          );

      debugPrint('📤 Upload result: $uploadResult');

      // Get public URL
      final publicUrl = client.storage
          .from('avatars')
          .getPublicUrl(filePath);

      debugPrint('🔗 Public URL: $publicUrl');
      return publicUrl;
    } catch (e) {
      debugPrint('❌ Upload error details: $e');
      throw Exception('Failed to upload profile picture: $e');
    }
  }

  // Increment view count for a class
  Future<void> incrementClassViews(String classId) async {
    try {
      if (kDebugMode) {
        debugPrint('📈 Starting view increment for class: $classId');
      }
      
      // Try RPC function first (if it exists)
      try {
        final response = await client.rpc('increment_class_views', params: {
          'class_id': classId,
        });
        
        if (kDebugMode) {
          debugPrint('📊 RPC response: $response');
          debugPrint('✅ View increment completed via RPC for class $classId');
        }
        return;
      } catch (rpcError) {
        if (kDebugMode) {
          debugPrint('❌ RPC not available, trying direct update: $rpcError');
        }
      }
      
      // Fallback to direct update with proper null handling
      final currentResponse = await client
          .from('classes')
          .select('views')
          .eq('id', classId)
          .single();
      
      final currentViews = currentResponse['views'] as int? ?? 0;
      final newViews = currentViews + 1;
      
      if (kDebugMode) {
        debugPrint('📊 Current views: $currentViews, New views: $newViews');
      }
      
      // Use a more robust update approach
      final updateResponse = await client
          .from('classes')
          .update({
            'views': newViews,
            'updated_at': DateTime.now().toIso8601String(),
          })
          .eq('id', classId);
      
      if (kDebugMode) {
        debugPrint('📊 Update response: $updateResponse');
      }
      
      // Verify the update worked
      final verifyResponse = await client
          .from('classes')
          .select('views')
          .eq('id', classId)
          .single();
      
      if (kDebugMode) {
        debugPrint('📊 Verification response: $verifyResponse');
        debugPrint('✅ View increment completed for class $classId');
      }
      
    } catch (e) {
      if (kDebugMode) {
        debugPrint('❌ Error incrementing views: $e');
        debugPrint('❌ Error type: ${e.runtimeType}');
        debugPrint('❌ Stack trace: ${StackTrace.current}');
      }
      // Don't throw error to avoid breaking video playback
    }
  }

  // Banner Methods
  Future<List<Banner>> getBanners() async {
    try {
      if (kDebugMode) {
        debugPrint('🔍 Querying Supabase banners table...');
      }
      
      final response = await client
          .from('banners')
          .select()
          .eq('is_active', true)
          .order('display_order', ascending: true)
          .order('created_at', ascending: false);
      
      if (kDebugMode) {
        debugPrint('📡 Supabase banners response: $response');
        debugPrint('📡 Response length: ${response.length}');
      }
      
      if (response.isEmpty) {
        if (kDebugMode) {
          debugPrint('⚠️ No banners found in database');
        }
        return [];
      }
      
      final banners = (response as List)
          .map((banner) {
            if (kDebugMode) {
              debugPrint('🔄 Converting banner: $banner');
            }
            return Banner.fromJson(banner);
          })
          .toList();
      
      if (kDebugMode) {
        debugPrint('✅ Successfully converted ${banners.length} banners');
      }
      
      return banners;
    } catch (e) {
      if (kDebugMode) {
        debugPrint('❌ Database error getting banners: $e');
      }
      rethrow;
    }
  }

  Future<Banner?> getPrimaryBanner() async {
    try {
      if (kDebugMode) {
        debugPrint('🔍 Getting primary banner...');
      }
      
      // Try using the RPC function first
      try {
        final response = await client.rpc('get_primary_banner');
        
        if (kDebugMode) {
          debugPrint('📡 RPC response: $response');
        }
        
        if (response != null && response.isNotEmpty) {
          return Banner.fromJson(response[0]);
        }
      } catch (rpcError) {
        if (kDebugMode) {
          debugPrint('❌ RPC not available, trying direct query: $rpcError');
        }
      }
      
      // Fallback to direct query
      final response = await client
          .from('banners')
          .select()
          .eq('is_active', true)
          .order('display_order', ascending: true)
          .order('created_at', ascending: false)
          .limit(1);
      
      if (kDebugMode) {
        debugPrint('📡 Direct query response: $response');
      }
      
      if (response.isNotEmpty) {
        return Banner.fromJson(response[0]);
      }
      
      return null;
    } catch (e) {
      if (kDebugMode) {
        debugPrint('❌ Database error getting primary banner: $e');
      }
      return null;
    }
  }

  Future<Banner> getBannerById(String bannerId) async {
    try {
      final response = await client
          .from('banners')
          .select()
          .eq('id', bannerId)
          .single();
      
      return Banner.fromJson(response);
    } catch (e) {
      throw Exception('Banner not found: $bannerId');
    }
  }

  // Real-time subscription for auth changes
  Stream<AuthState> get authStateChanges => client.auth.onAuthStateChange;

  // Enrollment Methods
  Future<bool> hasEnrollment(String courseId) async {
    try {
      final user = currentUser;
      if (user == null) return false;
      final resp = await client
          .from('enrollments')
          .select('id')
          .eq('user_id', user.id)
          .eq('course_id', courseId)
          .maybeSingle();
      return resp != null;
    } catch (e) {
      if (kDebugMode) {
        debugPrint('Enrollment check failed: $e');
      }
      return false;
    }
  }

  Future<void> createEnrollment({required String courseId}) async {
    try {
      final user = currentUser;
      if (user == null) {
        throw Exception('User not authenticated');
      }
      await _ensureUserRowExists(user.id, user.email);
      final payload = {
        'user_id': user.id,
        'course_id': courseId,
        'enrolled_at': DateTime.now().toIso8601String(),
      };
      final resp = await client
          .from('enrollments')
          .upsert(payload, onConflict: 'user_id,course_id')
          .select('id')
          .maybeSingle();
      if (kDebugMode) {
        debugPrint('✅ Enrollment upsert resp: $resp');
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('❌ createEnrollment error: $e');
      }
      rethrow;
    }
  }

  // Record a purchase with payment metadata
  Future<void> createPurchase({
    required String courseId,
    required int amountPaise,
    String currency = 'INR',
    String? paymentId,
    String? orderId,
    String? signature,
    String status = 'success',
  }) async {
    final user = currentUser;
    if (user == null) throw Exception('User not authenticated');
    await _ensureUserRowExists(user.id, user.email);
    await client.from('purchases').insert({
      'user_id': user.id,
      'course_id': courseId,
      'amount_paise': amountPaise,
      'currency': currency,
      'payment_id': paymentId,
      'order_id': orderId,
      'signature': signature,
      'status': status,
      'created_at': DateTime.now().toIso8601String(),
    });
  }

  Future<void> _ensureUserRowExists(String userId, String? email) async {
    try {
      final existing = await client
          .from('users')
          .select('id')
          .eq('id', userId)
          .maybeSingle();
      if (existing == null) {
        await client.from('users').insert({
          'id': userId,
          'email': email ?? '',
          'created_at': DateTime.now().toIso8601String(),
          'updated_at': DateTime.now().toIso8601String(),
        });
        if (kDebugMode) {
          debugPrint('👤 Inserted missing users row for $userId');
        }
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('❌ ensureUserRowExists error: $e');
      }
      // Don't block purchase; continue. RLS may block without policy, handled by SQL policies.
    }
  }
}
