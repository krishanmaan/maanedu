import 'package:flutter/foundation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/link.dart';

class LinkProvider extends ChangeNotifier {
  final SupabaseClient _supabase = Supabase.instance.client;
  
  List<Link> _links = [];
  bool _isLoading = false;
  String? _error;

  List<Link> get links => _links;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get hasLinks => _links.isNotEmpty;

  Future<void> loadLinks() async {
    _setLoading(true);
    _error = null;

    try {
      final response = await _supabase
          .from('links')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', ascending: true)
          .order('created_at', ascending: false);

      _links = response.map((json) => Link.fromJson(json)).toList();
    } catch (e) {
      _error = e.toString();
      if (kDebugMode) {
        print('Error loading links: $e');
      }
    } finally {
      _setLoading(false);
    }
  }

  Future<void> refreshLinks() async {
    await loadLinks();
  }

  Future<void> addLink(Link link) async {
    try {
      final response = await _supabase
          .from('links')
          .insert(link.toJson())
          .select()
          .single();

      final newLink = Link.fromJson(response);
      _links.add(newLink);
      _links.sort((a, b) {
        if (a.sortOrder != b.sortOrder) {
          return a.sortOrder.compareTo(b.sortOrder);
        }
        return b.createdAt.compareTo(a.createdAt);
      });
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      if (kDebugMode) {
        print('Error adding link: $e');
      }
      notifyListeners();
    }
  }

  Future<void> updateLink(Link link) async {
    try {
      final response = await _supabase
          .from('links')
          .update(link.toJson())
          .eq('id', link.id)
          .select()
          .single();

      final updatedLink = Link.fromJson(response);
      final index = _links.indexWhere((l) => l.id == link.id);
      if (index != -1) {
        _links[index] = updatedLink;
        notifyListeners();
      }
    } catch (e) {
      _error = e.toString();
      if (kDebugMode) {
        print('Error updating link: $e');
      }
      notifyListeners();
    }
  }

  Future<void> deleteLink(String linkId) async {
    try {
      await _supabase
          .from('links')
          .delete()
          .eq('id', linkId);

      _links.removeWhere((link) => link.id == linkId);
      notifyListeners();
    } catch (e) {
      _error = e.toString();
      if (kDebugMode) {
        print('Error deleting link: $e');
      }
      notifyListeners();
    }
  }

  List<Link> getLinksByCategory(String category) {
    return _links.where((link) => link.category == category).toList();
  }

  List<String> getCategories() {
    final categories = _links
        .map((link) => link.category)
        .where((category) => category != null)
        .cast<String>()
        .toSet()
        .toList();
    categories.sort();
    return categories;
  }

  void _setLoading(bool loading) {
    _isLoading = loading;
    notifyListeners();
  }

  void clearError() {
    _error = null;
    notifyListeners();
  }
}
