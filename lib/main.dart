import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'providers/auth_provider.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'providers/course_provider.dart';
import 'providers/banner_provider.dart';
import 'providers/link_provider.dart';
import 'services/supabase_service.dart';
import 'services/enhanced_storage_service.dart';
import 'services/realtime_service.dart';
import 'services/sync_service.dart';
import 'utils/app_router.dart';
import 'utils/constants.dart';
import 'core/theme/app_theme.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Set transparent status bar
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
      statusBarBrightness: Brightness.dark, // For iOS
    ),
  );

  // Initialize services
  try {
    await SupabaseService.initialize();
    await EnhancedStorageService.instance.initialize();
    await RealtimeService.instance.initialize();
    await SyncService.instance.initialize();
  } catch (e) {
    debugPrint('Failed to initialize services: $e');
  }

  // Restore last route
  String? initialLocation;
  try {
    final prefs = await SharedPreferences.getInstance();
    initialLocation = prefs.getString('last_route');
  } catch (_) {}

  runApp(MyApp(initialLocation: initialLocation));
}

class MyApp extends StatelessWidget {
  final String? initialLocation;
  const MyApp({super.key, this.initialLocation});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(
          create: (_) {
            final provider = CourseProvider();
            provider.initialize(); // Initialize with enhanced services
            return provider;
          },
        ),
        ChangeNotifierProvider(create: (_) => BannerProvider()),
        ChangeNotifierProvider(create: (_) => LinkProvider()),
      ],
      child: Consumer<AuthProvider>(
        builder: (context, authProvider, _) {
          return MaterialApp.router(
            title: AppConstants.appName,
            debugShowCheckedModeBanner: false,
            theme: AppTheme.lightTheme,
            themeMode: ThemeMode.light, // Force light theme
            routerConfig: AppRouter.createRouter(
              authProvider,
              initialLocation: initialLocation,
            ),
          );
        },
      ),
    );
  }
}
