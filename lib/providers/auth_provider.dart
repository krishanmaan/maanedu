import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import '../models/user.dart';
import '../services/supabase_service.dart';

class AuthProvider extends ChangeNotifier {
  final SupabaseService _supabaseService = SupabaseService.instance;
  
  AppUser? _user;
  bool _isLoading = false;
  String? _errorMessage;

  AppUser? get user => _user;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  bool get isLoggedIn => _user != null;

  // Keys for shared preferences
  static const String _userKey = 'user_data';
  static const String _loginStateKey = 'is_logged_in';

  AuthProvider() {
    _initializeAuth();
  }

  void _initializeAuth() async {
    // First, try to load user from local storage
    await _loadUserFromStorage();
    
    // Listen to auth state changes
    _supabaseService.authStateChanges.listen((AuthState data) {
      if (data.event == AuthChangeEvent.signedIn) {
        _loadUserProfile();
      } else if (data.event == AuthChangeEvent.signedOut) {
        _user = null;
        _clearUserFromStorage();
        notifyListeners();
      }
    });

    // Check if user is already signed in with Supabase
    if (_supabaseService.isLoggedIn) {
      _loadUserProfile();
    }
  }

  Future<void> _loadUserProfile() async {
    try {
      _user = await _supabaseService.getUserProfile();
      await _saveUserToStorage(_user!);
      notifyListeners();
    } catch (e) {
      _errorMessage = e.toString();
      notifyListeners();
    }
  }

  // Local Storage Methods
  Future<void> _saveUserToStorage(AppUser user) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final userJson = jsonEncode(user.toJson());
      await prefs.setString(_userKey, userJson);
      await prefs.setBool(_loginStateKey, true);
    } catch (e) {
      if (kDebugMode) {
        debugPrint('Error saving user to storage: $e');
      }
    }
  }

  Future<void> _loadUserFromStorage() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final isLoggedIn = prefs.getBool(_loginStateKey) ?? false;
      
      if (isLoggedIn) {
        final userJson = prefs.getString(_userKey);
        if (userJson != null) {
          final userMap = jsonDecode(userJson) as Map<String, dynamic>;
          _user = AppUser.fromJson(userMap);
          notifyListeners();
        }
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('Error loading user from storage: $e');
      }
    }
  }

  Future<void> _clearUserFromStorage() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_userKey);
      await prefs.setBool(_loginStateKey, false);
    } catch (e) {
      if (kDebugMode) {
        debugPrint('Error clearing user from storage: $e');
      }
    }
  }

  Future<bool> signUp({
    required String email,
    required String password,
    String? name,
  }) async {
    try {
      _setLoading(true);
      _clearError();

      final response = await _supabaseService.signUp(
        email: email,
        password: password,
        name: name,
      );

      if (response.user != null) {
        await _loadUserProfile();
        return true;
      }
      return false;
    } catch (e) {
      _setError('Sign up failed: ${e.toString()}');
      return false;
    } finally {
      _setLoading(false);
    }
  }

  Future<bool> signIn({
    required String email,
    required String password,
  }) async {
    try {
      _setLoading(true);
      _clearError();

      final response = await _supabaseService.signIn(
        email: email,
        password: password,
      );

      if (response.user != null) {
        // Try to load user profile, but don't fail if users table doesn't exist yet
        try {
          await _loadUserProfile();
        } catch (e) {
          debugPrint('Warning: Could not load user profile: $e');
          // Create a basic user object from auth data
          _user = AppUser(
            id: response.user!.id,
            email: response.user!.email ?? email,
            name: response.user!.userMetadata?['name'] ?? 'User',
            avatar: null,
            createdAt: DateTime.parse(response.user!.createdAt),
          );
          notifyListeners();
        }
        return true;
      }
      return false;
    } catch (e) {
      debugPrint('Sign in error: $e');
      _setError('Sign in failed: ${e.toString()}');
      return false;
    } finally {
      _setLoading(false);
    }
  }

  Future<void> signOut() async {
    try {
      _setLoading(true);
      await _supabaseService.signOut();
      _user = null;
      await _clearUserFromStorage();
    } catch (e) {
      _setError('Sign out failed: ${e.toString()}');
    } finally {
      _setLoading(false);
    }
  }

  Future<bool> updateProfile({String? name, String? avatar}) async {
    try {
      _setLoading(true);
      _clearError();

      await _supabaseService.updateUserProfile(
        name: name,
        avatar: avatar,
      );

      await _loadUserProfile(); // This will save to storage automatically
      return true;
    } catch (e) {
      _setError('Profile update failed: ${e.toString()}');
      return false;
    } finally {
      _setLoading(false);
    }
  }

  Future<bool> updateProfilePicture(Uint8List imageBytes, String fileExtension) async {
    try {
      _setLoading(true);
      _clearError();

      if (_user == null) {
        _setError('User not found');
        return false;
      }

      debugPrint('🖼️ Starting profile picture upload for user: ${_user!.id}');
      debugPrint('📁 File extension: $fileExtension');
      debugPrint('📏 Image size: ${imageBytes.length} bytes');

      // Upload image to Supabase Storage
      final avatarUrl = await _supabaseService.uploadProfilePictureFromBytes(
        imageBytes,
        _user!.id,
        fileExtension,
      );

      debugPrint('✅ Image uploaded successfully. URL: $avatarUrl');

      // Update user profile with new avatar URL
      await _supabaseService.updateUserProfile(avatar: avatarUrl);
      debugPrint('✅ Profile updated with new avatar URL');

      // Reload user profile to get updated data
      await _loadUserProfile();
      debugPrint('✅ User profile reloaded successfully');
      return true;
    } catch (e) {
      debugPrint('❌ Profile picture upload failed: $e');
      _setError('Failed to update profile picture: ${e.toString()}');
      return false;
    } finally {
      _setLoading(false);
    }
  }

  void _setLoading(bool loading) {
    _isLoading = loading;
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
}
