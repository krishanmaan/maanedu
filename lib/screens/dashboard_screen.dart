import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:go_router/go_router.dart';
import '../providers/auth_provider.dart';
import '../providers/course_provider.dart';
import '../providers/banner_provider.dart';
import '../models/banner.dart' as banner_model;
import '../utils/constants.dart';
import '../core/theme/app_colors.dart';
import 'dart:async';
// Removed dart:typed_data; Uint8List available via services.dart import
import 'package:cached_network_image/cached_network_image.dart';

class DashboardScreen extends StatefulWidget {
  const DashboardScreen({super.key});

  @override
  State<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends State<DashboardScreen>
    with
        WidgetsBindingObserver,
        AutomaticKeepAliveClientMixin<DashboardScreen> {
  // Banner carousel state
  final PageController _bannerPageController = PageController(
    viewportFraction: 1.0,
  );
  Timer? _bannerAutoSlideTimer;
  int _currentBannerIndex = 0;
  bool _isUserInteractingWithBanner = false;
  bool _hasInitialized = false;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) async {
      if (_hasInitialized) return;
      _hasInitialized = true;
      if (!mounted) return;
      await context.read<CourseProvider>().loadCourses();
      if (!mounted) return;
      final bannerProvider = context.read<BannerProvider>();
      // Load banners first; only load primary if no list banners
      await bannerProvider.loadBanners();
      if (!mounted) return;
      if (!bannerProvider.hasBanners) {
        await bannerProvider.loadPrimaryBanner();
        if (!mounted) return;
      }
      await _precacheBanners(bannerProvider);
      if (!mounted) return;
      _startBannerAutoSlide(bannerProvider);
    });
  }

  void _startBannerAutoSlide(BannerProvider provider) {
    _bannerAutoSlideTimer?.cancel();
    if (!mounted) return;
    if (!provider.hasBanners) return;
    if (_isUserInteractingWithBanner) return;
    _bannerAutoSlideTimer = Timer.periodic(const Duration(seconds: 4), (_) {
      if (!mounted) return;
      final total = provider.banners.length;
      if (total <= 1) return;
      final nextIndex = (_currentBannerIndex + 1) % total;
      _bannerPageController.animateToPage(
        nextIndex,
        duration: const Duration(milliseconds: 500),
        curve: Curves.easeInOut,
      );
    });
  }

  Future<void> _precacheBanners(BannerProvider provider) async {
    if (!mounted) return;
    try {
      for (final b in provider.banners) {
        if (b.imageUrl.isEmpty) continue;
        final imageProvider = _resolveBannerImageProvider(b.imageUrl);
        if (!mounted) return;
        await precacheImage(imageProvider, context);
      }
      final primary = provider.primaryBanner;
      if (primary != null && primary.imageUrl.isNotEmpty) {
        final imageProvider = _resolveBannerImageProvider(primary.imageUrl);
        if (!mounted) return;
        await precacheImage(imageProvider, context);
      }
    } catch (_) {
      // ignore
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    super.didChangeAppLifecycleState(state);
    final bannerProvider = mounted ? context.read<BannerProvider>() : null;
    switch (state) {
      case AppLifecycleState.resumed:
        if (bannerProvider != null) {
          _startBannerAutoSlide(bannerProvider);
        }
        break;
      case AppLifecycleState.inactive:
      case AppLifecycleState.paused:
      case AppLifecycleState.detached:
      case AppLifecycleState.hidden:
        _bannerAutoSlideTimer?.cancel();
        break;
    }
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // Cancel banner auto-slide when a new route overlays this screen
    final route = ModalRoute.of(context);
    route?.addScopedWillPopCallback(() async {
      _bannerAutoSlideTimer?.cancel();
      return true;
    });
  }

  @override
  void deactivate() {
    // Pause any ongoing timers when navigating away
    _bannerAutoSlideTimer?.cancel();
    super.deactivate();
  }

  @override
  void dispose() {
    _bannerAutoSlideTimer?.cancel();
    _bannerPageController.dispose();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  Future<bool> _onWillPop() async {
    // Show exit confirmation dialog
    return await showDialog<bool>(
          context: context,
          builder: (context) => AlertDialog(
            title: Text(
              'Exit App',
              style: GoogleFonts.poppins(fontWeight: FontWeight.w600),
            ),
            content: Text(
              'Are you sure you want to exit the app?',
              style: GoogleFonts.poppins(),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.of(context).pop(false),
                child: Text(
                  'Cancel',
                  style: GoogleFonts.poppins(color: Colors.grey),
                ),
              ),
              TextButton(
                onPressed: () {
                  Navigator.of(context).pop(true);
                  SystemNavigator.pop(); // Exit app
                },
                child: Text(
                  'Exit',
                  style: GoogleFonts.poppins(color: AppColors.error),
                ),
              ),
            ],
          ),
        ) ??
        false;
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    // Check if we can go back in the navigation stack
    final canGoBack = GoRouter.of(context).canPop();

    return PopScope(
      canPop:
          canGoBack, // Allow normal back navigation if there's a previous screen
      onPopInvokedWithResult: (didPop, result) async {
        if (!didPop && !canGoBack) {
          // Only show exit confirmation if there's no previous screen
          final shouldPop = await _onWillPop();
          if (shouldPop && context.mounted) {
            SystemNavigator.pop();
          }
        }
      },
      child: Scaffold(
        backgroundColor: AppColors.background,
        body: RefreshIndicator(
          onRefresh: () async {
            if (!mounted) return;

            final courseProvider = context.read<CourseProvider>();
            final bannerProvider = context.read<BannerProvider>();

            await courseProvider.loadCourses();
            await bannerProvider.loadBanners();
            await bannerProvider.refreshPrimaryBanner();
            _startBannerAutoSlide(bannerProvider);
          },
          child: SingleChildScrollView(
            physics: const AlwaysScrollableScrollPhysics(),
            child: Column(
              children: [
                // Enhanced Header Section
                Container(
                  padding: EdgeInsets.only(
                    top: MediaQuery.of(context).padding.top + 10,
                    left: 20,
                    right: 20,
                    bottom: 20,
                  ),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: AppColors.primaryGradient,
                    ),
                    borderRadius: const BorderRadius.only(
                      bottomLeft: Radius.circular(30),
                      bottomRight: Radius.circular(30),
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.primary.withValues(alpha: 0.3),
                        blurRadius: 20,
                        offset: const Offset(0, 10),
                      ),
                    ],
                  ),
                  child: Column(
                    children: [
                      Row(
                        children: [
                          // Enhanced User Info
                          Expanded(
                            child: Consumer<AuthProvider>(
                              builder: (context, authProvider, _) {
                                final isLoading = authProvider.isLoading;
                                final user = authProvider.user;
                                String displayName = '';
                                if (user != null) {
                                  final rawName = user.name?.trim();
                                  if (rawName != null && rawName.isNotEmpty) {
                                    displayName = rawName.split(' ').first;
                                  } else {
                                    // fallback to email prefix or Guest
                                    final email = user.email;
                                    displayName = email.contains('@')
                                        ? email.split('@').first
                                        : 'Guest';
                                  }
                                }

                                return Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    if (isLoading)
                                      Container(
                                        width: 160,
                                        height: 26,
                                        decoration: BoxDecoration(
                                          color: Colors.white.withValues(
                                            alpha: 0.25,
                                          ),
                                          borderRadius: BorderRadius.circular(
                                            6,
                                          ),
                                        ),
                                      )
                                    else
                                      Text(
                                        'Hello, ${displayName.isNotEmpty ? displayName : 'Guest'}',
                                        style: GoogleFonts.poppins(
                                          fontSize: 24,
                                          fontWeight: FontWeight.w700,
                                          color: Colors.white,
                                        ),
                                      ),
                                    const SizedBox(height: 8),
                                    Container(
                                      padding: const EdgeInsets.symmetric(
                                        horizontal: 12,
                                        vertical: 6,
                                      ),
                                      decoration: BoxDecoration(
                                        color: Colors.white.withValues(
                                          alpha: 0.2,
                                        ),
                                        borderRadius: BorderRadius.circular(20),
                                        border: Border.all(
                                          color: Colors.white.withValues(
                                            alpha: 0.3,
                                          ),
                                          width: 1,
                                        ),
                                      ),
                                      child: Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          const Icon(
                                            Icons.school,
                                            size: 16,
                                            color: Colors.white,
                                          ),
                                          const SizedBox(width: 6),
                                          Text(
                                            'BATCH 2025',
                                            style: GoogleFonts.poppins(
                                              fontSize: 12,
                                              fontWeight: FontWeight.w600,
                                              color: Colors.white,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  ],
                                );
                              },
                            ),
                          ),
                          // Enhanced Profile Avatar
                          Consumer<AuthProvider>(
                            builder: (context, authProvider, _) {
                              final isLoading = authProvider.isLoading;
                              final user = authProvider.user;
                              final avatarUrl = user?.avatar?.trim();
                              String initials = 'S';
                              if (user != null) {
                                final rawName =
                                    (user.name?.trim() ?? '').isNotEmpty
                                    ? user.name!.trim()
                                    : (user.email.contains('@')
                                          ? user.email.split('@').first
                                          : 'Student');
                                initials = rawName.isNotEmpty
                                    ? rawName.substring(0, 1).toUpperCase()
                                    : 'S';
                              }
                              return GestureDetector(
                                onTap: () =>
                                    context.go(AppConstants.profileRoute),
                                child: Container(
                                  padding: const EdgeInsets.all(3),
                                  decoration: BoxDecoration(
                                    shape: BoxShape.circle,
                                    border: Border.all(
                                      color: Colors.white,
                                      width: 2,
                                    ),
                                    boxShadow: [
                                      BoxShadow(
                                        color: Colors.black.withValues(
                                          alpha: 0.1,
                                        ),
                                        blurRadius: 8,
                                        offset: const Offset(0, 2),
                                      ),
                                    ],
                                  ),
                                  child: CircleAvatar(
                                    radius: 25,
                                    backgroundColor: Colors.white,
                                    backgroundImage:
                                        (avatarUrl != null &&
                                            avatarUrl.isNotEmpty)
                                        ? NetworkImage(avatarUrl)
                                        : null,
                                    child: (isLoading)
                                        ? const SizedBox(
                                            width: 18,
                                            height: 18,
                                            child: CircularProgressIndicator(
                                              strokeWidth: 2,
                                            ),
                                          )
                                        : (avatarUrl != null &&
                                              avatarUrl.isNotEmpty)
                                        ? null
                                        : Text(
                                            initials,
                                            style: GoogleFonts.poppins(
                                              fontSize: 20,
                                              fontWeight: FontWeight.w700,
                                              color: AppColors.primary,
                                            ),
                                          ),
                                  ),
                                ),
                              );
                            },
                          ),
                        ],
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 24),

                // Enhanced Banner Card - Dynamic from Supabase
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: Consumer<BannerProvider>(
                    builder: (context, bannerProvider, _) {
                      if (bannerProvider.isLoading) {
                        return Container(
                          width: double.infinity,
                          height: 220,
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(20),
                            color: AppColors.grey200,
                          ),
                          child: const Center(
                            child: CircularProgressIndicator(),
                          ),
                        );
                      }

                      if (bannerProvider.error != null) {
                        return Container(
                          width: double.infinity,
                          height: 220,
                          decoration: BoxDecoration(
                            borderRadius: BorderRadius.circular(20),
                            color: AppColors.grey200,
                          ),
                          child: Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(
                                  Icons.error_outline,
                                  color: AppColors.grey600,
                                  size: 32,
                                ),
                                const SizedBox(height: 8),
                                Text(
                                  'Failed to load banner',
                                  style: GoogleFonts.poppins(
                                    color: AppColors.grey600,
                                    fontSize: 14,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      }

                      // If multiple banners, show carousel
                      if (bannerProvider.hasBanners) {
                        final banners = bannerProvider.banners;
                        // Ensure current index within bounds
                        if (_currentBannerIndex >= banners.length) {
                          _currentBannerIndex = 0;
                        }
                        return RepaintBoundary(
                          child: _buildBannerCarousel(banners),
                        );
                      }

                      // Fallback to single primary banner
                      final banner = bannerProvider.primaryBanner;
                      if (banner == null) {
                        return RepaintBoundary(child: _buildDefaultBanner());
                      }
                      return RepaintBoundary(
                        child: _buildDynamicBanner(banner),
                      );
                    },
                  ),
                ),

                const SizedBox(height: 24),

                // Quick Access Grid
                Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 20),
                  child: _buildQuickAccessGrid(),
                ),

                const SizedBox(height: 20),
              ],
            ),
          ),
        ),
      ), // Closing PopScope child: Scaffold
    ); // Closing PopScope
  }

  Widget _buildQuickAccessGrid() {
    final quickAccessItems = [
      {
        'title': 'Live Classes',
        'iconPath': 'assets/icon/live.png',
        'primaryColor': AppColors.success,
        'secondaryColor': AppColors.successDark,
        'accentColor': AppColors.successLight,
      },
      {
        'title': 'Online Courses',
        'iconPath': 'assets/icon/onlinecoures.png',
        'primaryColor': AppColors.info,
        'secondaryColor': AppColors.infoDark,
        'accentColor': AppColors.infoLight,
      },
      {
        'title': 'Units',
        'iconPath': 'assets/icon/units.png',
        'primaryColor': AppColors.design,
        'secondaryColor': Color(0xFF7B1FA2),
        'accentColor': Color(0xFFBA68C8),
      },
      {
        'title': 'Test Series',
        'iconPath': 'assets/icon/tast.png',
        'primaryColor': AppColors.warning,
        'secondaryColor': AppColors.warningDark,
        'accentColor': AppColors.warningLight,
      },
      {
        'title': 'Study Guide',
        'iconPath': 'assets/icon/studay.png',
        'primaryColor': AppColors.success,
        'secondaryColor': AppColors.successDark,
        'accentColor': AppColors.successLight,
      },
      {
        'title': 'Link',
        'iconPath': 'assets/icon/link.png',
        'primaryColor': AppColors.music,
        'secondaryColor': Color(0xFFC2185B),
        'accentColor': Color(0xFFF06292),
      },
    ];

    return GridView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
        crossAxisCount: 3,
        childAspectRatio: 0.85,
        crossAxisSpacing: 12,
        mainAxisSpacing: 12,
      ),
      itemCount: quickAccessItems.length,
      itemBuilder: (context, index) {
        final item = quickAccessItems[index];
        return TweenAnimationBuilder<double>(
          duration: Duration(milliseconds: 200 + (index * 50)),
          tween: Tween(begin: 0.0, end: 1.0),
          curve: Curves.easeOutCubic,
          builder: (context, value, child) {
            return Transform.translate(
              offset: Offset(0, 20 * (1 - value)),
              child: Opacity(
                opacity: value,
                child: GestureDetector(
                  onTap: () {
                    // Add haptic feedback
                    HapticFeedback.lightImpact();

                    // Handle quick access tap
                    switch (item['title']) {
                      case 'Online Courses':
                        // Navigate directly to online courses screen
                        context.push(AppConstants.onlineCoursesRoute);
                        break;
                      case 'Link':
                        context.push(AppConstants.linksRoute);
                        break;
                      case 'Units':
                        context.push(AppConstants.profileRoute);
                        break;
                      default:
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(
                            content: Text('${item['title']} coming soon!'),
                            backgroundColor: AppColors.grey800,
                            duration: const Duration(seconds: 2),
                            behavior: SnackBarBehavior.floating,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10),
                            ),
                          ),
                        );
                    }
                  },
                  child: Container(
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(
                        color: (item['primaryColor'] as Color).withValues(
                          alpha: 0.1,
                        ),
                        width: 1.5,
                      ),
                      boxShadow: [
                        BoxShadow(
                          color: (item['primaryColor'] as Color).withValues(
                            alpha: 0.08,
                          ),
                          blurRadius: 20,
                          offset: const Offset(0, 8),
                          spreadRadius: 0,
                        ),
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.05),
                          blurRadius: 10,
                          offset: const Offset(0, 2),
                          spreadRadius: 0,
                        ),
                      ],
                    ),
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        // Icon container with enhanced design
                        Container(
                          width: 60,
                          height: 60,
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              begin: Alignment.topLeft,
                              end: Alignment.bottomRight,
                              colors: [
                                (item['primaryColor'] as Color).withValues(
                                  alpha: 0.9,
                                ),
                                (item['secondaryColor'] as Color).withValues(
                                  alpha: 0.8,
                                ),
                                (item['accentColor'] as Color).withValues(
                                  alpha: 0.7,
                                ),
                              ],
                              stops: const [0.0, 0.6, 1.0],
                            ),
                            borderRadius: BorderRadius.circular(18),
                            border: Border.all(
                              color: Colors.white.withValues(alpha: 0.3),
                              width: 2,
                            ),
                            boxShadow: [
                              BoxShadow(
                                color: (item['primaryColor'] as Color)
                                    .withValues(alpha: 0.4),
                                blurRadius: 15,
                                offset: const Offset(0, 6),
                                spreadRadius: 0,
                              ),
                              BoxShadow(
                                color: Colors.white.withValues(alpha: 0.6),
                                blurRadius: 8,
                                offset: const Offset(-2, -2),
                                spreadRadius: 0,
                              ),
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.1),
                                blurRadius: 10,
                                offset: const Offset(0, 3),
                                spreadRadius: 0,
                              ),
                            ],
                          ),
                          child: Center(
                            child: Image.asset(
                              item['iconPath'] as String,
                              width: 32,
                              height: 32,
                              fit: BoxFit.contain,
                              errorBuilder: (context, error, stackTrace) {
                                return Icon(
                                  Icons.category,
                                  size: 28,
                                  color: Colors.white,
                                );
                              },
                            ),
                          ),
                        ),
                        const SizedBox(height: 12),
                        // Title with new typography
                        Text(
                          item['title'] as String,
                          style: GoogleFonts.poppins(
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                            color: const Color(0xFF2D3748),
                            letterSpacing: 0.2,
                          ),
                          textAlign: TextAlign.center,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 4),
                        // Subtle accent dot
                        Container(
                          width: 4,
                          height: 4,
                          decoration: BoxDecoration(
                            color: (item['accentColor'] as Color),
                            shape: BoxShape.circle,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildBannerCarousel(List<banner_model.Banner> banners) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        SizedBox(
          height: 220,
          child: NotificationListener<ScrollNotification>(
            onNotification: (notification) {
              if (notification is ScrollStartNotification) {
                _isUserInteractingWithBanner = true;
                _bannerAutoSlideTimer?.cancel();
              } else if (notification is ScrollEndNotification) {
                _isUserInteractingWithBanner = false;
                if (mounted) {
                  final provider = context.read<BannerProvider>();
                  // Small delay so fling settles
                  Future.delayed(const Duration(milliseconds: 400), () {
                    if (mounted && !_isUserInteractingWithBanner) {
                      _startBannerAutoSlide(provider);
                    }
                  });
                }
              }
              return false;
            },
            child: PageView.builder(
              key: const PageStorageKey('banner_carousel'),
              controller: _bannerPageController,
              itemCount: banners.length,
              padEnds: true,
              allowImplicitScrolling: true,
              onPageChanged: (index) {
                setState(() {
                  _currentBannerIndex = index;
                });
              },
              itemBuilder: (context, index) {
                final banner = banners[index];
                return Padding(
                  padding: const EdgeInsets.only(bottom: 8),
                  child: _buildDynamicBanner(banner),
                );
              },
            ),
          ),
        ),
        const SizedBox(height: 8),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: List.generate(banners.length, (i) {
            final isActive = i == _currentBannerIndex;
            return AnimatedContainer(
              duration: const Duration(milliseconds: 250),
              margin: const EdgeInsets.symmetric(horizontal: 4),
              height: 6,
              width: isActive ? 18 : 6,
              decoration: BoxDecoration(
                color: isActive ? const Color(0xFF6D57FC) : Colors.grey[400],
                borderRadius: BorderRadius.circular(3),
              ),
            );
          }),
        ),
      ],
    );
  }

  ImageProvider _resolveBannerImageProvider(String imageUrl) {
    try {
      if (imageUrl.startsWith('data:image')) {
        final uriData = UriData.parse(imageUrl);
        final Uint8List bytes = Uint8List.fromList(uriData.contentAsBytes());
        return MemoryImage(bytes);
      }
      if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
        return CachedNetworkImageProvider(imageUrl);
      }
      // If it's a Supabase storage path without full URL, try to treat as network URL
      // You can replace this with a function that builds a public URL if needed.
      return CachedNetworkImageProvider(imageUrl);
    } catch (_) {
      return const AssetImage('assets/1.png');
    }
  }

  @override
  bool get wantKeepAlive => true;

  Widget _buildDynamicBanner(banner_model.Banner banner) {
    return GestureDetector(
      onTap: () {
        if (banner.targetRoute != null) {
          context.push(banner.targetRoute!);
        }
      },
      child: Container(
        width: double.infinity,
        height: 220,
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(20),
          image: banner.imageUrl.isNotEmpty
              ? DecorationImage(
                  image: _resolveBannerImageProvider(banner.imageUrl),
                  fit: BoxFit.cover,
                  onError: (exception, stackTrace) {
                    // Fallback handled by AssetImage return above if parse fails
                  },
                )
              : const DecorationImage(
                  image: AssetImage('assets/1.png'),
                  fit: BoxFit.cover,
                ),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.1),
              blurRadius: 15,
              offset: const Offset(0, 8),
            ),
          ],
        ),
        child: Container(
          decoration: BoxDecoration(borderRadius: BorderRadius.circular(20)),
          child: const SizedBox.shrink(), // Empty content - just show the image
        ),
      ),
    );
  }

  Widget _buildDefaultBanner() {
    return Container(
      width: double.infinity,
      height: 180,
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        image: const DecorationImage(
          image: AssetImage('assets/1.png'),
          fit: BoxFit.cover,
        ),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.1),
            blurRadius: 15,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Container(
        decoration: BoxDecoration(borderRadius: BorderRadius.circular(20)),
        child: const SizedBox.shrink(), // Empty content - just show the image
      ),
    );
  }
}
