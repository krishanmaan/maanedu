import 'package:go_router/go_router.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../screens/splash_screen.dart';
import '../screens/login_screen.dart';
import '../screens/signup_screen.dart';

import '../screens/dashboard_screen.dart';
import '../screens/online_courses_screen.dart';
import '../screens/course_detail_screen.dart';
import '../screens/video_player_screen.dart';
import '../screens/profile_screen.dart';
import '../screens/debug_views_screen.dart';
import '../screens/links_screen.dart';
import '../components/bottom_nav.dart';
import '../screens/mycourses_screen.dart';


import '../providers/auth_provider.dart';
import '../utils/constants.dart';

class AppRouter {
  static final RouteObserver<PageRoute<dynamic>> routeObserver = RouteObserver<PageRoute<dynamic>>();
  static Future<void> _saveLastRoute(String path) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('last_route', path);
    } catch (_) {}
  }
  static GoRouter createRouter(AuthProvider authProvider, {String? initialLocation}) {
    return GoRouter(
      initialLocation: AppConstants.splashRoute,
      refreshListenable: authProvider,
      observers: [routeObserver],
      redirect: (context, state) {
        final isLoggedIn = authProvider.isLoggedIn;
        final loc = state.matchedLocation;
        final isOnAuth = loc == AppConstants.loginRoute || loc == AppConstants.signupRoute;
        final isOnSplash = loc == AppConstants.splashRoute;

        // Persist last visited route (non-blocking)
        () async {
          try {
            final prefs = await SharedPreferences.getInstance();
            await prefs.setString('last_route', state.matchedLocation);
          } catch (_) {}
        }();

        // If user is logged in and on splash screen, go directly to main navigation
        if (isLoggedIn && isOnSplash) {
          return AppConstants.mainNavigationRoute;
        }

        // If not logged in and not on auth/splash pages, redirect to login
        if (!isLoggedIn && !isOnAuth && !isOnSplash) {
          return AppConstants.loginRoute;
        }

        // If logged in and on auth/splash pages, always land on main navigation
        if (isLoggedIn && (isOnAuth || isOnSplash)) {
          return AppConstants.mainNavigationRoute;
        }

        return null;
      },
      routes: [
      // Splash Screen
      GoRoute(
        path: AppConstants.splashRoute,
        name: 'splash',
        builder: (context, state) {
          _saveLastRoute(state.matchedLocation);
          return const SplashScreen();
        },
      ),
      
      // Authentication Routes
      GoRoute(
        path: AppConstants.loginRoute,
        name: 'login',
        builder: (context, state) {
          _saveLastRoute(state.matchedLocation);
          return const LoginScreen();
        },
      ),
      
      GoRoute(
        path: AppConstants.signupRoute,
        name: 'signup',
        builder: (context, state) {
          _saveLastRoute(state.matchedLocation);
          return const SignupScreen();
        },
      ),
      
      
        
        // Main App Routes with Bottom Navigation Shell
      ShellRoute(
        builder: (context, state, child) {
          return MainNavigationShell(child: child);
        },
        routes: [
          GoRoute(
            path: AppConstants.dashboardRoute,
            name: 'dashboard',
            builder: (context, state) {
              _saveLastRoute(state.matchedLocation);
              return const DashboardScreen();
            },
          ),
          
          GoRoute(
            path: AppConstants.onlineCoursesRoute,
            name: 'online-courses',
            builder: (context, state) {
              _saveLastRoute(state.matchedLocation);
              return const OnlineCoursesScreen();
            },
          ),
          
          // My Courses explicit route
          GoRoute(
            path: AppConstants.myCoursesRoute,
            name: 'my-courses',
            builder: (context, state) {
              _saveLastRoute(state.matchedLocation);
              return const MyCoursesScreen();
            },
          ),
          
          GoRoute(
            path: AppConstants.profileRoute,
            name: 'profile',
            builder: (context, state) {
              _saveLastRoute(state.matchedLocation);
              return const ProfileScreen();
            },
          ),
          
          GoRoute(
            path: AppConstants.linksRoute,
            name: 'links',
            builder: (context, state) {
              _saveLastRoute(state.matchedLocation);
              return const LinksScreen();
            },
          ),
        ],
      ),
      
      // Standalone routes (without bottom navigation)
      GoRoute(
        path: '${AppConstants.courseDetailRoute}/:courseId',
        name: 'course-detail',
        builder: (context, state) {
          final courseId = state.pathParameters['courseId']!;
          _saveLastRoute(state.matchedLocation);
          return CourseDetailScreen(courseId: courseId);
        },
      ),
      
      GoRoute(
        path: '${AppConstants.videoPlayerRoute}/:classId',
        name: 'video-player',
        builder: (context, state) {
          final classId = state.pathParameters['classId']!;
          _saveLastRoute(state.matchedLocation);
          return VideoPlayerScreen(classId: classId);
        },
      ),
      
      // Debug route (only in debug mode)
      if (kDebugMode)
        GoRoute(
          path: '/debug-views',
          name: 'debug-views',
          builder: (context, state) {
            return const DebugViewsScreen();
          },
        ),
      

    ],
    
    // Error handling
    errorBuilder: (context, state) {
      return Scaffold(
        appBar: AppBar(
          title: const Text('Error'),
        ),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(
                Icons.error_outline,
                size: 64,
                color: Colors.red,
              ),
              const SizedBox(height: 16),
              Text(
                'Page not found',
                style: Theme.of(context).textTheme.headlineSmall,
              ),
              const SizedBox(height: 8),
              Text(
                state.error?.toString() ?? 'Unknown error',
                style: Theme.of(context).textTheme.bodyMedium,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () => context.go(AppConstants.mainNavigationRoute),
                child: const Text('Go to Home'),
              ),
            ],
          ),
        ),
      );
    },
    );
  }
  
  // Legacy router for backwards compatibility
  static final GoRouter router = createRouter(AuthProvider());
}

// Reserved for future route-aware helpers if needed
