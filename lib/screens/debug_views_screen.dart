import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/course_provider.dart';
import '../services/supabase_service.dart';

class DebugViewsScreen extends StatefulWidget {
  const DebugViewsScreen({super.key});

  @override
  State<DebugViewsScreen> createState() => _DebugViewsScreenState();
}

class _DebugViewsScreenState extends State<DebugViewsScreen> {
  String _debugOutput = '';
  bool _isLoading = false;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Debug Views'),
        backgroundColor: Colors.blue,
        foregroundColor: Colors.white,
      ),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            ElevatedButton(
              onPressed: _testViewIncrement,
              child: const Text('Test View Increment'),
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _testDatabaseConnection,
              child: const Text('Test Database Connection'),
            ),
            const SizedBox(height: 16),
            ElevatedButton(
              onPressed: _loadClassesData,
              child: const Text('Load Classes Data'),
            ),
            const SizedBox(height: 16),
            if (_isLoading)
              const CircularProgressIndicator()
            else
              Expanded(
                child: SingleChildScrollView(
                  child: Text(
                    _debugOutput,
                    style: const TextStyle(fontFamily: 'monospace'),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }

  void _addDebugOutput(String message) {
    setState(() {
      _debugOutput += '${DateTime.now().toIso8601String()}: $message\n';
    });
    if (kDebugMode) {
      debugPrint(message);
    }
  }

  Future<void> _testDatabaseConnection() async {
    setState(() {
      _isLoading = true;
      _debugOutput = '';
    });

    try {
      _addDebugOutput('🔍 Testing database connection...');
      
      // Test basic connection
      final response = await SupabaseService.instance.client
          .from('classes')
          .select('id, title, views')
          .limit(3);
      
      _addDebugOutput('✅ Database connection successful');
      _addDebugOutput('📊 Response: $response');
      
      // Test views column specifically
      for (var item in response) {
        _addDebugOutput('📝 Class: ${item['title']}, Views: ${item['views']} (${item['views'].runtimeType})');
      }
      
    } catch (e) {
      _addDebugOutput('❌ Database connection failed: $e');
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _loadClassesData() async {
    setState(() {
      _isLoading = true;
      _debugOutput = '';
    });

    try {
      _addDebugOutput('🔄 Loading classes data...');
      
      final courseProvider = Provider.of<CourseProvider>(context, listen: false);
      await courseProvider.loadAllClasses();
      
      final classes = courseProvider.classes;
      _addDebugOutput('✅ Loaded ${classes.length} classes');
      
      for (var classItem in classes.take(5)) {
        _addDebugOutput('📚 ${classItem.title}: views=${classItem.views}');
      }
      
    } catch (e) {
      _addDebugOutput('❌ Failed to load classes: $e');
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  Future<void> _testViewIncrement() async {
    setState(() {
      _isLoading = true;
      _debugOutput = '';
    });

    try {
      _addDebugOutput('📈 Testing view increment...');
      
      // Get first class for testing
      final courseProvider = Provider.of<CourseProvider>(context, listen: false);
      await courseProvider.loadAllClasses();
      
      final classes = courseProvider.classes;
      if (classes.isEmpty) {
        _addDebugOutput('❌ No classes found');
        return;
      }
      
      final testClass = classes.first;
      _addDebugOutput('🎯 Testing with class: ${testClass.title} (${testClass.id})');
      _addDebugOutput('📊 Current views: ${testClass.views}');
      
      // Test increment
      await SupabaseService.instance.incrementClassViews(testClass.id);
      
      _addDebugOutput('✅ View increment call completed');
      
      // Wait and refresh
      await Future.delayed(const Duration(seconds: 2));
      await courseProvider.loadAllClasses();
      
      final updatedClass = courseProvider.classes.firstWhere(
        (c) => c.id == testClass.id,
        orElse: () => testClass,
      );
      
      _addDebugOutput('📊 Updated views: ${updatedClass.views}');
      
    } catch (e) {
      _addDebugOutput('❌ View increment test failed: $e');
      _addDebugOutput('❌ Error type: ${e.runtimeType}');
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }
}
