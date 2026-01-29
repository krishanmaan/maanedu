import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import '../utils/constants.dart';

/// Custom Bottom Navigation Bar Component
/// 
/// This component provides a beautiful bottom navigation bar with:
/// - Smooth animations and transitions
/// - Custom styling with rounded corners and shadows
/// - Integration with GoRouter for navigation
/// - Four main sections: Home, Courses, Links, Profile
/// 
/// Usage:
/// The MainNavigationShell widget automatically wraps main app screens
/// and provides the bottom navigation. Individual screens don't need
/// to handle navigation - it's managed centrally through the router.

class CustomBottomNavigationBar extends StatefulWidget {
  final int currentIndex;
  
  const CustomBottomNavigationBar({
    super.key,
    required this.currentIndex,
  });

  @override
  State<CustomBottomNavigationBar> createState() => _CustomBottomNavigationBarState();
}

class _CustomBottomNavigationBarState extends State<CustomBottomNavigationBar> {
  late int _currentIndex;

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.currentIndex;
  }

  @override
  void didUpdateWidget(CustomBottomNavigationBar oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.currentIndex != oldWidget.currentIndex) {
      setState(() {
        _currentIndex = widget.currentIndex;
      });
    }
  }

  void _onItemTapped(int index) {
    setState(() {
      _currentIndex = index;
    });

    switch (index) {
      case 0:
        context.go(AppConstants.dashboardRoute);
        break;
      case 1:
        context.go(AppConstants.myCoursesRoute);
        break;
      case 2:
        context.go(AppConstants.linksRoute);
        break;
      case 3:
        context.go(AppConstants.profileRoute);
        break;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.1),
            blurRadius: 20,
            offset: const Offset(0, -5),
            spreadRadius: 0,
          ),
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, -2),
            spreadRadius: 0,
          ),
        ],
        borderRadius: const BorderRadius.only(
          topLeft: Radius.circular(25),
          topRight: Radius.circular(25),
        ),
      ),
      child: ClipRRect(
        borderRadius: const BorderRadius.only(
          topLeft: Radius.circular(25),
          topRight: Radius.circular(25),
        ),
        child: Material(
          color: Colors.transparent,
          child: BottomNavigationBar(
          currentIndex: _currentIndex,
          onTap: _onItemTapped,
          type: BottomNavigationBarType.fixed,
          backgroundColor: Colors.white,
          selectedItemColor: const Color(0xFF6D57FC),
          unselectedItemColor: Colors.grey[600],
          selectedLabelStyle: GoogleFonts.poppins(
            fontSize: 12,
            fontWeight: FontWeight.w600,
          ),
          unselectedLabelStyle: GoogleFonts.poppins(
            fontSize: 11,
            fontWeight: FontWeight.w500,
          ),
          elevation: 0,
          items: [
            BottomNavigationBarItem(
              icon: _buildNavIcon(
                icon: Icons.home_outlined,
                selectedIcon: Icons.home,
                index: 0,
              ),
              label: 'Home',
            ),
            BottomNavigationBarItem(
              icon: _buildNavIcon(
                icon: Icons.play_circle_outline,
                selectedIcon: Icons.play_circle,
                index: 1,
              ),
              label: 'Courses',
            ),
            BottomNavigationBarItem(
              icon: _buildNavIcon(
                icon: Icons.link_outlined,
                selectedIcon: Icons.link,
                index: 2,
              ),
              label: 'Links',
            ),
            BottomNavigationBarItem(
              icon: _buildNavIcon(
                icon: Icons.person_outline,
                selectedIcon: Icons.person,
                index: 3,
              ),
              label: 'Profile',
            ),
          ],
          ),
        ),
      ),
    );
  }

  Widget _buildNavIcon({
    required IconData icon,
    required IconData selectedIcon,
    required int index,
  }) {
    final isSelected = _currentIndex == index;
    
    return AnimatedContainer(
      duration: const Duration(milliseconds: 200),
      curve: Curves.easeInOut,
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: isSelected 
            ? const Color(0xFF6D57FC).withValues(alpha: 0.1)
            : Colors.transparent,
        borderRadius: BorderRadius.circular(12),
      ),
      child: AnimatedScale(
        duration: const Duration(milliseconds: 200),
        scale: isSelected ? 1.1 : 1.0,
        child: Icon(
          isSelected ? selectedIcon : icon,
          size: 24,
          color: isSelected 
              ? const Color(0xFF6D57FC)
              : Colors.grey[600],
        ),
      ),
    );
  }
}

// Main Navigation Shell Widget
class MainNavigationShell extends StatefulWidget {
  final Widget child;
  
  const MainNavigationShell({
    super.key,
    required this.child,
  });

  @override
  State<MainNavigationShell> createState() => _MainNavigationShellState();
}

class _MainNavigationShellState extends State<MainNavigationShell> {
  int _currentIndex = 0;

  void _updateCurrentIndex(String location) {
    if (location.startsWith(AppConstants.dashboardRoute)) {
      _currentIndex = 0;
    } else if (location.startsWith(AppConstants.onlineCoursesRoute)) {
      _currentIndex = 1;
    } else if (location.startsWith(AppConstants.linksRoute)) {
      _currentIndex = 2;
    } else if (location.startsWith(AppConstants.profileRoute)) {
      _currentIndex = 3;
    }
  }

  @override
  Widget build(BuildContext context) {
    final location = GoRouterState.of(context).matchedLocation;
    _updateCurrentIndex(location);

    return Scaffold(
      body: widget.child,
      bottomNavigationBar: CustomBottomNavigationBar(
        currentIndex: _currentIndex,
      ),
    );
  }
}
