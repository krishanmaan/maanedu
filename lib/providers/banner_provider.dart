import 'package:flutter/foundation.dart';
import '../models/banner.dart';
import '../services/supabase_service.dart';

class BannerProvider with ChangeNotifier {
  final SupabaseService _supabaseService = SupabaseService.instance;
  
  List<Banner> _banners = [];
  Banner? _primaryBanner;
  bool _isLoading = false;
  String? _error;

  // Getters
  List<Banner> get banners => _banners;
  Banner? get primaryBanner => _primaryBanner;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get hasBanners => _banners.isNotEmpty;
  bool get hasPrimaryBanner => _primaryBanner != null;

  // Load all banners
  Future<void> loadBanners() async {
    if (_isLoading) return;
    
    _setLoading(true);
    _clearError();
    
    try {
      if (kDebugMode) {
        debugPrint('🔄 Loading banners...');
      }
      
      final banners = await _supabaseService.getBanners();
      
      if (kDebugMode) {
        debugPrint('✅ Loaded ${banners.length} banners');
      }
      
      _banners = banners;
      notifyListeners();
    } catch (e) {
      _setError('Failed to load banners: $e');
      if (kDebugMode) {
        debugPrint('❌ Error loading banners: $e');
      }
    } finally {
      _setLoading(false);
    }
  }

  // Load primary banner
  Future<void> loadPrimaryBanner() async {
    if (_isLoading) return;
    
    _setLoading(true);
    _clearError();
    
    try {
      if (kDebugMode) {
        debugPrint('🔄 Loading primary banner...');
      }
      
      final banner = await _supabaseService.getPrimaryBanner();
      
      if (kDebugMode) {
        debugPrint('✅ Loaded primary banner: ${banner?.title ?? 'None'}');
      }
      
      _primaryBanner = banner;
      notifyListeners();
    } catch (e) {
      _setError('Failed to load primary banner: $e');
      if (kDebugMode) {
        debugPrint('❌ Error loading primary banner: $e');
      }
    } finally {
      _setLoading(false);
    }
  }

  // Load banner by ID
  Future<Banner?> loadBannerById(String bannerId) async {
    try {
      if (kDebugMode) {
        debugPrint('🔄 Loading banner by ID: $bannerId');
      }
      
      final banner = await _supabaseService.getBannerById(bannerId);
      
      if (kDebugMode) {
        debugPrint('✅ Loaded banner: ${banner.title}');
      }
      
      return banner;
    } catch (e) {
      _setError('Failed to load banner: $e');
      if (kDebugMode) {
        debugPrint('❌ Error loading banner by ID: $e');
      }
      return null;
    }
  }

  // Refresh banners
  Future<void> refreshBanners() async {
    await loadBanners();
  }

  // Refresh primary banner
  Future<void> refreshPrimaryBanner() async {
    await loadPrimaryBanner();
  }

  // Get banner by display order
  Banner? getBannerByOrder(int order) {
    try {
      return _banners.firstWhere((banner) => banner.displayOrder == order);
    } catch (e) {
      return null;
    }
  }

  // Get banners by category (if you add category field later)
  List<Banner> getBannersByCategory(String category) {
    return _banners.where((banner) => 
      banner.title.toLowerCase().contains(category.toLowerCase()) ||
      (banner.subtitle?.toLowerCase().contains(category.toLowerCase()) ?? false)
    ).toList();
  }

  // Clear all data
  void clearBanners() {
    _banners.clear();
    _primaryBanner = null;
    _clearError();
    notifyListeners();
  }

  // Private helper methods
  void _setLoading(bool loading) {
    _isLoading = loading;
    notifyListeners();
  }

  void _setError(String error) {
    _error = error;
    notifyListeners();
  }

  void _clearError() {
    _error = null;
  }

  // Dispose method - no additional cleanup needed
}
