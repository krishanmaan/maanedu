import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:shimmer/shimmer.dart';
import '../providers/course_provider.dart';
import '../utils/constants.dart';
import '../utils/video_utils.dart';
import 'package:video_player/video_player.dart';
import 'package:razorpay_flutter/razorpay_flutter.dart';
import '../services/supabase_service.dart';

class CourseDetailScreen extends StatefulWidget {
  final String courseId;

  const CourseDetailScreen({super.key, required this.courseId});

  @override
  State<CourseDetailScreen> createState() => _CourseDetailScreenState();
}

class _CourseDetailScreenState extends State<CourseDetailScreen> with AutomaticKeepAliveClientMixin<CourseDetailScreen> {
  VideoPlayerController? _demoController;
  bool _isDemoLoading = false;
  bool _isDescriptionExpanded = false;
  Razorpay? _razorpay;
  bool _hasInitialized = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_hasInitialized) return;
      _hasInitialized = true;
      if (!mounted) return;
      final courseProvider = context.read<CourseProvider>();
      courseProvider.loadCourse(widget.courseId);
      courseProvider.loadClasses(widget.courseId);
    });
    _razorpay = Razorpay();
    _razorpay!.on(Razorpay.EVENT_PAYMENT_SUCCESS, _onPaymentSuccess);
    _razorpay!.on(Razorpay.EVENT_PAYMENT_ERROR, _onPaymentError);
    _razorpay!.on(Razorpay.EVENT_EXTERNAL_WALLET, _onExternalWallet);
  }

  @override
  void dispose() {
    _demoController?.dispose();
    _razorpay?.clear();
    super.dispose();
  }

  void _startPurchaseFlow(CourseProvider courseProvider) {
    final course = courseProvider.selectedCourse;
    if (course == null) return;
    final amountInPaise = ((course.price ?? 0) * 100).toInt();
    if (kDebugMode) {
      debugPrint('🛒 Initiating purchase for course=${course.title} price=${course.price} amountInPaise=$amountInPaise');
      debugPrint('🔑 Using Razorpay key: ${AppConstants.razorpayKey}');
    }

    if (_razorpay == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Payment not initialized', style: GoogleFonts.poppins())),
      );
      return;
    }

    if (amountInPaise <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Invalid amount for payment', style: GoogleFonts.poppins())),
      );
      return;
    }
    // Use minimal options first for maximum compatibility; we can enable
    // advanced options after verifying the popup opens.
    var options = {
      'key': AppConstants.razorpayKey,
      'amount': amountInPaise,
      'currency': 'INR',
      'name': 'MaanEdu',
      'description': course.title,
      'prefill': {
        'contact': '',
        'email': SupabaseService.instance.currentUser?.email ?? ''
      }
    };
    try {
      _razorpay?.open(options);
    } catch (e) {
      if (kDebugMode) {
        debugPrint('❌ Razorpay open() failed: $e');
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Payment init failed', style: GoogleFonts.poppins())),
      );
    }
  }

  Future<void> _onPaymentSuccess(PaymentSuccessResponse response) async {
    final provider = context.read<CourseProvider>();
    try {
      // Save purchase with meta
      final course = provider.selectedCourse;
      final amountInPaise = (((course?.price ?? 0) * 100).toInt());
      await SupabaseService.instance.createPurchase(
        courseId: widget.courseId,
        amountPaise: amountInPaise,
        paymentId: response.paymentId,
        orderId: response.orderId,
        signature: response.signature,
        status: 'success',
      );
      await SupabaseService.instance.createEnrollment(courseId: widget.courseId);
      await provider.markPurchased(widget.courseId);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Payment successful', style: GoogleFonts.poppins())),
        );
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('❌ Enrollment save failed: $e');
      }
      if (mounted) {
        final msg = e.toString();
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text('Enrollment save failed: $msg', style: GoogleFonts.poppins()),
          duration: const Duration(seconds: 4),
        ));
      }
    }
  }

  void _onPaymentError(PaymentFailureResponse response) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('Payment failed', style: GoogleFonts.poppins())),
    );
  }

  void _onExternalWallet(ExternalWalletResponse response) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('External wallet selected', style: GoogleFonts.poppins())),
    );
  }

  Future<void> _playInlineDemo() async {
    // Toggle if controller already available
    if (_demoController != null && _demoController!.value.isInitialized) {
      if (_demoController!.value.isPlaying) {
        await _demoController!.pause();
        setState(() {});
        return;
      } else {
        await _demoController!.play();
        setState(() {});
        return;
      }
    }

    // Initialize and start playing
    final course = context.read<CourseProvider>().selectedCourse;
    final videoUrl = course?.videoUrl;
    if (videoUrl == null || videoUrl.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('No demo video available', style: GoogleFonts.poppins())),
      );
      return;
    }

    try {
      setState(() {
        _isDemoLoading = true;
      });
      String hlsUrl;
      if (VideoUtils.isMuxVideo(videoUrl)) {
        final playbackId = VideoUtils.extractMuxPlaybackId(videoUrl);
        if (playbackId == null) throw Exception('Invalid Mux playback ID');
        hlsUrl = VideoUtils.getMuxStreamUrl(playbackId);
      } else {
        hlsUrl = videoUrl; // expecting playable network HLS/MP4
      }

      final controller = VideoPlayerController.networkUrl(Uri.parse(hlsUrl));
      setState(() {
        _demoController = controller;
      });

      await controller.initialize();
      await controller.play();
      if (mounted) {
        setState(() {
          _isDemoLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _isDemoLoading = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Unable to play demo video', style: GoogleFonts.poppins())),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);
    return PopScope(
      canPop: true,
      onPopInvokedWithResult: (didPop, result) {
        if (didPop) {
          // Navigation handled by PopScope
          return;
        }
        // Fallback navigation
        if (context.canPop()) {
          context.pop();
        } else {
          context.go(AppConstants.onlineCoursesRoute);
        }
      },
      child: Scaffold(
        appBar: AppBar(
          title: Text(
            'Courses',
            style: GoogleFonts.poppins(fontWeight: FontWeight.w600),
          ),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back),
            onPressed: () {
              if (context.canPop()) {
                context.pop();
              } else {
                context.push(AppConstants.onlineCoursesRoute);
              }
            },
          ),
          actions: [
            IconButton(
              icon: const Icon(Icons.bookmark_border),
              onPressed: () {},
            ),
          ],
          backgroundColor: Colors.white,
          surfaceTintColor: Colors.white,
          elevation: 0.5,
        ),
        backgroundColor: const Color(0xFFF5F5F5),
        body: Consumer<CourseProvider>(
          builder: (context, courseProvider, _) {
            final course = courseProvider.selectedCourse;
            return SingleChildScrollView(
              child: Container(
                    // margin: const EdgeInsets.only(top: 2),
                    decoration: const BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.only(
                        topLeft: Radius.circular(25),
                        topRight: Radius.circular(25),
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Media Card
                        Padding(
                          padding: const EdgeInsets.fromLTRB(20, 20, 20, 12),
                          child: ClipRRect(
                            borderRadius: BorderRadius.circular(16),
                            child: AspectRatio(
                              aspectRatio: 16 / 9,
                              child: Stack(
                                children: [
                                  Positioned.fill(
                                    child: (_demoController != null && _demoController!.value.isInitialized)
                                        ? FittedBox(
                                            fit: BoxFit.cover,
                                            child: SizedBox(
                                              width: _demoController!.value.size.width,
                                              height: _demoController!.value.size.height,
                                              child: VideoPlayer(_demoController!),
                                            ),
                                          )
                                        : (course?.imageUrlOrThumbnail?.isNotEmpty == true)
                                            ? _buildCourseImage(course!.imageUrlOrThumbnail!)
                                            : _buildDefaultCourseBackground(),
                                  ),
                                  Positioned.fill(
                                    child: Container(
                                      color: Colors.black.withValues(alpha: 0.05),
                                    ),
                                  ),
                                  Center(
                                    child: Container(
                                      width: 54,
                                      height: 54,
                                      decoration: BoxDecoration(
                                        color: Colors.white,
                                        shape: BoxShape.circle,
                                        boxShadow: [
                                          BoxShadow(
                                            color: Colors.black.withValues(alpha: 0.15),
                                            blurRadius: 10,
                                            offset: const Offset(0, 4),
                                          ),
                                        ],
                                      ),
                                      child: InkWell(
                                        borderRadius: BorderRadius.circular(27),
                                        onTap: _playInlineDemo,
                                        child: Center(
                                          child: Icon(
                                            _isDemoLoading
                                                ? Icons.hourglass_top
                                                : (_demoController != null && _demoController!.value.isInitialized && _demoController!.value.isPlaying)
                                                    ? Icons.pause
                                                    : Icons.play_arrow,
                                            size: 30,
                                          ),
                                        ),
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),

                        // Badges / Stats Row
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 20),
                          child: Row(
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFE8F1FF),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text('BESTSELLER', style: GoogleFonts.poppins(fontSize: 10, fontWeight: FontWeight.w700, color: const Color(0xFF3B82F6))),
                              ),
                              const SizedBox(width: 12),
                              const Icon(Icons.group, size: 16, color: Colors.black54),
                              const SizedBox(width: 4),
                              Text('5.7k', style: GoogleFonts.poppins(fontSize: 12, color: Colors.black54)),
                              const SizedBox(width: 12),
                              const Icon(Icons.star, size: 16, color: Colors.amber),
                              const SizedBox(width: 4),
                              Text('4.9', style: GoogleFonts.poppins(fontSize: 12, color: Colors.black54)),
                            ],
                          ),
                        ),

                        // Title & Description
                        Padding(
                          padding: const EdgeInsets.fromLTRB(20, 14, 20, 8),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                course?.title ?? 'Course',
                                style: GoogleFonts.poppins(
                                  fontSize: 22,
                                  fontWeight: FontWeight.w700,
                                  color: Colors.black87,
                                ),
                              ),
                              const SizedBox(height: 8),
                              if ((course?.description ?? '').isNotEmpty)
                                _buildExpandableDescription(course!.description),
                              const SizedBox(height: 12),
                              if (course != null)
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      course.price != null ? '₹${course.price!.toStringAsFixed(0)}' : 'Free',
                                      style: GoogleFonts.poppins(fontSize: 18, fontWeight: FontWeight.w700, color: Colors.black87),
                                    ),
                                    if (!courseProvider.isCoursePurchased(course.id))
                                      ElevatedButton(
                                        onPressed: () => _startPurchaseFlow(courseProvider),
                                        style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF6366F1)),
                                        child: Text('Buy Now', style: GoogleFonts.poppins(color: Colors.white)),
                                      )
                                    else
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                        decoration: BoxDecoration(color: Colors.green[100], borderRadius: BorderRadius.circular(8)),
                                        child: Text('Purchased', style: GoogleFonts.poppins(color: Colors.green[700], fontWeight: FontWeight.w600)),
                                      ),
                                  ],
                                ),
                            ],
                          ),
                        ),

                        // Features list
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 20),
                          child: Column(
                            children: [
                              _buildFeatureTile(Icons.play_circle_outline, '${_calculateTotalDuration(courseProvider.classes)} Video'),
                              const SizedBox(height: 8),
                              _buildFeatureTile(Icons.menu_book, 'Total ${courseProvider.classes.length}+ Lessons'),
                              const SizedBox(height: 8),
                              _buildFeatureTile(Icons.download, 'Download Resources'),
                            ],
                          ),
                        ),

                        const SizedBox(height: 16),

                        // Students avatars row
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 20),
                          child: Row(
                            children: [
                              ...List.generate(4, (i) => Padding(
                                padding: EdgeInsets.only(right: i == 3 ? 0 : 8),
                                child: CircleAvatar(
                                  radius: 16,
                                  backgroundImage: NetworkImage('https://i.pravatar.cc/150?img=${i + 10}'),
                                ),
                              )),
                              const SizedBox(width: 8),
                              Container(
                                width: 32,
                                height: 32,
                                decoration: BoxDecoration(
                                  color: Colors.grey[200],
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(Icons.add, size: 18),
                              ),
                            ],
                          ),
                        ),
                        const SizedBox(height: 20),
                        // Lessons header
                        Padding(
                          padding: const EdgeInsets.all(20),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Student Study', style: GoogleFonts.poppins(fontSize: 14, fontWeight: FontWeight.w600, color: Colors.black54)),
                              const SizedBox(height: 16),
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(
                                    '1 Lessons',
                                    style: GoogleFonts.poppins(
                                      fontSize: 24,
                                      fontWeight: FontWeight.bold,
                                      color: Colors.black87,
                                    ),
                                  ),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                    decoration: BoxDecoration(
                                      color: Colors.grey[200],
                                      borderRadius: BorderRadius.circular(15),
                                    ),
                                    child: Row(children: [
                                      Icon(Icons.access_time, size: 16, color: Colors.grey[600]),
                                      const SizedBox(width: 4),
                                      Text(_calculateTotalDuration(courseProvider.classes), style: GoogleFonts.poppins(fontSize: 12, color: Colors.grey[600])),
                                    ]),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 8),
                            ],
                          ),
                        ),

                        // Debug Info (only in debug mode)
                        if (kDebugMode) ...[
                          Container(
                            margin: const EdgeInsets.symmetric(
                              horizontal: 20,
                              vertical: 10,
                            ),
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: Colors.blue[50],
                              borderRadius: BorderRadius.circular(8),
                              border: Border.all(color: Colors.blue[200]!),
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Debug Info:',
                                  style: GoogleFonts.poppins(
                                    fontSize: 12,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.blue[800],
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  'Course ID: ${widget.courseId}',
                                  style: GoogleFonts.poppins(
                                    fontSize: 10,
                                    color: Colors.blue[700],
                                  ),
                                ),
                                Text(
                                  'Classes Count: ${courseProvider.classes.length}',
                                  style: GoogleFonts.poppins(
                                    fontSize: 10,
                                    color: Colors.blue[700],
                                  ),
                                ),
                                if (courseProvider.classes.isNotEmpty) ...[
                                  Text(
                                    'Video Types: ${_getVideoTypesDebugInfo(courseProvider.classes)}',
                                    style: GoogleFonts.poppins(
                                      fontSize: 10,
                                      color: Colors.blue[700],
                                    ),
                                  ),
                                ],
                                Text(
                                  'Loading: ${courseProvider.isLoadingClasses}',
                                  style: GoogleFonts.poppins(
                                    fontSize: 10,
                                    color: Colors.blue[700],
                                  ),
                                ),
                                if (courseProvider.errorMessage != null)
                                  Text(
                                    'Error: ${courseProvider.errorMessage}',
                                    style: GoogleFonts.poppins(
                                      fontSize: 10,
                                      color: Colors.red[700],
                                    ),
                                  ),
                              ],
                            ),
                          ),
                        ],

                        // Classes List
                        // Lessons list
                        Padding(
                          padding: const EdgeInsets.only(bottom: 24),
                          child: courseProvider.isLoadingClasses
                              ? _buildShimmerClassList()
                              : courseProvider.classes.isEmpty
                              ? _buildEmptyWidget(courseProvider)
                              : ListView.builder(
                                  shrinkWrap: true,
                                  physics: const NeverScrollableScrollPhysics(),
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 20,
                                  ),
                                  itemCount: courseProvider.classes.length,
                                  itemBuilder: (context, index) {
                                    final classItem =
                                        courseProvider.classes[index];
                                    return _buildClassTile(
                                      classItem,
                                      index,
                                      courseProvider,
                                    );
                                  },
                                ),
                        ),
                      ],
                    ),
                  ),
            );
          },
        ),
      ),
    );
  }

  Widget _buildCourseImage(String imageUrl) {
    // Check if the URL is a base64 data URL
    if (imageUrl.startsWith('data:image/')) {
      try {
        // Extract base64 data from data URL
        final base64Data = imageUrl.split(',')[1];
        final bytes = base64Decode(base64Data);

        return Image.memory(
          bytes,
          fit: BoxFit.cover,
          errorBuilder: (context, error, stackTrace) {
            if (kDebugMode) {
              print('❌ Error loading base64 image: $error');
            }
            return _buildDefaultCourseBackground();
          },
        );
      } catch (e) {
        if (kDebugMode) {
          print('❌ Error parsing base64 image: $e');
        }
        return _buildDefaultCourseBackground();
      }
    } else {
      // Regular network image URL
      return CachedNetworkImage(
        imageUrl: imageUrl,
        fit: BoxFit.cover,
        placeholder: (context, url) => _buildDefaultCourseBackground(),
        errorWidget: (context, url, error) {
          if (kDebugMode) {
            print('❌ Error loading network image: $error');
          }
          return _buildDefaultCourseBackground();
        },
      );
    }
  }

  Widget _buildDefaultCourseBackground() {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [Color(0xFF2D1B69), Color(0xFF1A237E), Color(0xFF3949AB)],
        ),
      ),
      child: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.school,
              size: 80,
              color: Colors.white.withValues(alpha: 0.3),
            ),
            const SizedBox(height: 16),
            Text(
              'Course Thumbnail',
              style: GoogleFonts.poppins(
                color: Colors.white.withValues(alpha: 0.3),
                fontSize: 18,
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildClassImage(String imageUrl) {
    // Check if the URL is a base64 data URL
    if (imageUrl.startsWith('data:image/')) {
      try {
        // Extract base64 data from data URL
        final base64Data = imageUrl.split(',')[1];
        final bytes = base64Decode(base64Data);

        return Image.memory(
          bytes,
          fit: BoxFit.cover,
          width: 50,
          height: 50,
          errorBuilder: (context, error, stackTrace) {
            if (kDebugMode) {
              print('❌ Error loading class base64 image: $error');
            }
            return _buildDefaultClassThumbnail();
          },
        );
      } catch (e) {
        if (kDebugMode) {
          print('❌ Error parsing class base64 image: $e');
        }
        return _buildDefaultClassThumbnail();
      }
    } else {
      // Regular network image URL
      return CachedNetworkImage(
        imageUrl: imageUrl,
        fit: BoxFit.cover,
        width: 50,
        height: 50,
        placeholder: (context, url) => Container(
          width: 50,
          height: 50,
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [Color(0xFF6366F1), Color(0xFF8B5CF6)],
            ),
          ),
          child: const Center(
            child: CircularProgressIndicator(
              color: Colors.white,
              strokeWidth: 2,
            ),
          ),
        ),
        errorWidget: (context, url, error) {
          if (kDebugMode) {
            print('❌ Error loading class network image: $error');
          }
          return _buildDefaultClassThumbnail();
        },
      );
    }
  }

  Widget _buildDefaultClassThumbnail() {
    return Container(
      width: 50,
      height: 50,
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [Color(0xFF6366F1), Color(0xFF8B5CF6)],
        ),
      ),
      child: const Center(
        child: Icon(Icons.play_arrow, color: Colors.white, size: 24),
      ),
    );
  }

  Widget _buildMuxClassThumbnail(String videoUrl) {
    final playbackId = VideoUtils.extractMuxPlaybackId(videoUrl);
    if (playbackId == null) {
      return _buildDefaultClassThumbnail();
    }

    final thumbnailUrl = VideoUtils.getMuxThumbnailUrl(
      playbackId,
      width: 100,
      height: 100,
    );

    return CachedNetworkImage(
      imageUrl: thumbnailUrl,
      fit: BoxFit.cover,
      width: 50,
      height: 50,
      placeholder: (context, url) => Container(
        width: 50,
        height: 50,
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFF6366F1), Color(0xFF8B5CF6)],
          ),
        ),
        child: const Center(
          child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
        ),
      ),
      errorWidget: (context, url, error) {
        if (kDebugMode) {
          print('❌ Error loading Mux thumbnail: $error');
        }
        return _buildDefaultClassThumbnail();
      },
    );
  }

  

  Widget _buildFeatureTile(IconData icon, String text) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
      decoration: BoxDecoration(
        color: const Color(0xFFF7F7F9),
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Container(
            width: 28,
            height: 28,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Icon(icon, size: 16, color: const Color(0xFF6366F1)),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Text(
              text,
              style: GoogleFonts.poppins(fontSize: 13, color: Colors.black87, fontWeight: FontWeight.w500),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildClassTile(
    dynamic classItem,
    int index,
    CourseProvider courseProvider,
  ) {
    // Handle both real class data and fallback data with safe access
    String classTitle;
    String classDuration;
    String classDescription;
    bool isFree;
    bool hasImage;
    String? imageUrl;
    String? videoUrl;

    try {
      if (classItem is Map<String, dynamic>) {
        // Handle raw JSON data
        classTitle =
            classItem['title'] ??
            '${_getClassPrefix(index)} - ${_getClassNames()[index % _getClassNames().length]}';
        final duration = classItem['duration_minutes'] as int?;
        classDuration = (duration != null && duration > 0)
            ? '${duration}min'
            : _getClassDuration(index);
        classDescription = classItem['description'] ?? 'Video lesson';
        isFree = classItem['is_free'] ?? false;
        imageUrl = classItem['image_url'];
        videoUrl = classItem['video_url'];
        hasImage = imageUrl != null && imageUrl.isNotEmpty;
      } else {
        // Handle Class object
        classTitle =
            classItem.title ??
            '${_getClassPrefix(index)} - ${_getClassNames()[index % _getClassNames().length]}';
        final duration = classItem.duration_minutes;
        classDuration = (duration != null && duration > 0)
            ? '${duration}min'
            : _getClassDuration(index);
        classDescription = classItem.description ?? 'Video lesson';
        isFree = classItem.is_free ?? false;
        imageUrl = classItem.image_url;
        videoUrl = classItem.videoUrl;
        hasImage = imageUrl != null && imageUrl.isNotEmpty;
      }
    } catch (e) {
      // Fallback if any error
      classTitle =
          '${_getClassPrefix(index)} - ${_getClassNames()[index % _getClassNames().length]}';
      classDuration = _getClassDuration(index);
      classDescription = 'Video lesson';
      isFree = false;
      hasImage = false;
      imageUrl = null;
      videoUrl = null;
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.05),
            blurRadius: 10,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.all(16),
        leading: Container(
          width: 50,
          height: 50,
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            gradient: hasImage
                ? null
                : LinearGradient(colors: _getGradientColors(index)),
          ),
          child: hasImage
              ? ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: _buildClassImage(imageUrl!),
                )
              : (videoUrl != null && VideoUtils.isMuxVideo(videoUrl))
              ? ClipRRect(
                  borderRadius: BorderRadius.circular(12),
                  child: _buildMuxClassThumbnail(videoUrl),
                )
              : Center(
                  child: Icon(
                    isFree ? Icons.play_circle_outline : Icons.play_arrow,
                    color: Colors.white,
                    size: 24,
                  ),
                ),
        ),
        title: Row(
          children: [
            Expanded(
              child: Text(
                classTitle,
                style: GoogleFonts.poppins(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: Colors.black87,
                ),
              ),
            ),
            if (isFree)
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                decoration: BoxDecoration(
                  color: Colors.green[100],
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Text(
                  'FREE',
                  style: GoogleFonts.poppins(
                    fontSize: 10,
                    fontWeight: FontWeight.w600,
                    color: Colors.green[700],
                  ),
                ),
              ),
          ],
        ),
        subtitle: Padding(
          padding: const EdgeInsets.only(top: 4),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (classDescription.isNotEmpty)
                Text(
                  classDescription,
                  style: GoogleFonts.poppins(
                    fontSize: 12,
                    color: Colors.grey[600],
                  ),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
              const SizedBox(height: 2),
              Text(
                '$classDuration Video',
                style: GoogleFonts.poppins(
                  fontSize: 12,
                  color: Colors.grey[500],
                  fontWeight: FontWeight.w500,
                ),
              ),
            ],
          ),
        ),
        trailing: Container(
          width: 32,
          height: 32,
          decoration: BoxDecoration(
            color: isFree ? Colors.green[100] : Colors.grey[100],
            shape: BoxShape.circle,
          ),
          child: Icon(
            isFree ? Icons.play_circle_outline : Icons.lock_outline,
            color: isFree ? Colors.green[600] : Colors.grey[500],
            size: 18,
          ),
        ),
        onTap: () {
          try {
            String? classId;
            if (classItem is Map<String, dynamic>) {
              classId = classItem['id'];
            } else {
              classId = classItem.id;
            }

            final purchased = courseProvider.isCoursePurchased(widget.courseId);
            if (isFree || purchased) {
              courseProvider.selectClass(classItem);
              context.push(
                '${AppConstants.videoPlayerRoute}/${classId ?? index.toString()}',
              );
            } else {
              // Show locked content message
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(
                    'This content is locked. Please purchase the course to access.',
                    style: GoogleFonts.poppins(),
                  ),
                  backgroundColor: Colors.orange[600],
                ),
              );
            }
          } catch (e) {
            // Show error if something goes wrong
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(
                  'Unable to access this content.',
                  style: GoogleFonts.poppins(),
                ),
                backgroundColor: Colors.red[600],
              ),
            );
          }
        },
      ),
    );
  }

  List<Color> _getGradientColors(int index) {
    final gradients = [
      [const Color(0xFF6366F1), const Color(0xFF8B5CF6)], // Purple
      [const Color(0xFFEC4899), const Color(0xFFF59E0B)], // Pink to Orange
      [const Color(0xFF059669), const Color(0xFF10B981)], // Green
      [const Color(0xFF3B82F6), const Color(0xFF1D4ED8)], // Blue
      [const Color(0xFFEF4444), const Color(0xFFF97316)], // Red to Orange
    ];
    return gradients[index % gradients.length];
  }

  String _getClassPrefix(int index) {
    return '0${index + 1}'.padLeft(2, '0');
  }

  List<String> _getClassNames() {
    return [
      'Trailer',
      'Shape',
      'Coloring',
      'Typography',
      'Animation',
      'Effects',
      'Rendering',
      'Final Review',
    ];
  }

  String _getClassDuration(int index) {
    final durations = [
      '1h 5min',
      '15min',
      '45min',
      '30min',
      '20min',
      '1h 10min',
      '25min',
      '40min',
    ];
    return durations[index % durations.length];
  }

  String _calculateTotalDuration(List<dynamic> classes) {
    int totalMinutes = 0;

    for (var classItem in classes) {
      try {
        // Try to get duration_minutes safely
        int? duration;
        if (classItem is Map<String, dynamic>) {
          duration = classItem['duration_minutes'] as int?;
        } else {
          // If it's a Class object, use getter
          duration = classItem.duration_minutes;
        }

        if (duration != null && duration > 0) {
          totalMinutes += duration;
        } else {
          // Fallback to estimated duration if not provided
          totalMinutes += 30; // Default 30 minutes per class
        }
      } catch (e) {
        // If any error, use fallback
        totalMinutes += 30;
      }
    }

    if (totalMinutes < 60) {
      return '${totalMinutes}min';
    } else {
      final hours = totalMinutes ~/ 60;
      final minutes = totalMinutes % 60;
      if (minutes == 0) {
        return '${hours}h';
      } else {
        return '${hours}h ${minutes}min';
      }
    }
  }

  Widget _buildShimmerClassList() {
    return ListView.builder(
      padding: const EdgeInsets.symmetric(horizontal: 20),
      itemCount: 5,
      itemBuilder: (context, index) => _buildShimmerClassTile(),
    );
  }

  Widget _buildShimmerClassTile() {
    return Shimmer.fromColors(
      baseColor: Colors.grey[300]!,
      highlightColor: Colors.grey[100]!,
      child: Container(
        margin: const EdgeInsets.only(bottom: 16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
        ),
        child: ListTile(
          contentPadding: const EdgeInsets.all(16),
          leading: Container(
            width: 50,
            height: 50,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(12),
            ),
          ),
          title: Container(
            width: double.infinity,
            height: 16,
            color: Colors.white,
          ),
          subtitle: Container(width: 100, height: 14, color: Colors.white),
          trailing: Container(
            width: 32,
            height: 32,
            decoration: const BoxDecoration(
              color: Colors.white,
              shape: BoxShape.circle,
            ),
          ),
        ),
      ),
    );
  }

  String _getVideoTypesDebugInfo(List<dynamic> classes) {
    Map<String, int> typeCounts = {};

    for (var classItem in classes) {
      try {
        String? videoUrl;
        if (classItem is Map<String, dynamic>) {
          videoUrl = classItem['video_url'];
        } else {
          videoUrl = classItem.videoUrl;
        }

        if (videoUrl != null && videoUrl.isNotEmpty) {
          final videoType = VideoUtils.getVideoType(videoUrl);
          final typeName = videoType.toString().split('.').last;
          typeCounts[typeName] = (typeCounts[typeName] ?? 0) + 1;
        }
      } catch (e) {
        // Ignore errors
      }
    }

    return typeCounts.entries.map((e) => '${e.key}:${e.value}').join(', ');
  }

  Widget _buildEmptyWidget(CourseProvider courseProvider) {
    return Padding(
      padding: const EdgeInsets.all(32),
      child: Center(
        child: Column(
          children: [
            Icon(
              Icons.play_circle_outline,
              size: 64,
              color: Theme.of(
                context,
              ).colorScheme.primary.withValues(alpha: 0.5),
            ),
            const SizedBox(height: 16),
            Text(
              'No classes available',
              style: GoogleFonts.poppins(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: Theme.of(context).colorScheme.onSurface,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              courseProvider.errorMessage ?? 'Classes will be added soon',
              style: GoogleFonts.poppins(
                fontSize: 14,
                color: Theme.of(
                  context,
                ).colorScheme.onSurface.withValues(alpha: 0.6),
              ),
              textAlign: TextAlign.center,
            ),
            if (kDebugMode) ...[
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () {
                  debugPrint('🔄 Manual reload triggered');
                  courseProvider.loadClasses(widget.courseId);
                },
                child: Text(
                  'Reload Classes',
                  style: GoogleFonts.poppins(fontSize: 12),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildExpandableDescription(String description) {
    // Check if description is long enough to need truncation
    final lines = description.split('\n');
    final isLongDescription = lines.length > 3 || description.length > 200;
    
    if (!isLongDescription) {
      // If description is short, show it normally
      return Text(
        description,
        style: GoogleFonts.poppins(fontSize: 13, color: Colors.black54, height: 1.45),
      );
    }

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          description,
          style: GoogleFonts.poppins(fontSize: 13, color: Colors.black54, height: 1.45),
          maxLines: _isDescriptionExpanded ? null : 3,
          overflow: _isDescriptionExpanded ? null : TextOverflow.ellipsis,
        ),
        const SizedBox(height: 8),
        GestureDetector(
          onTap: () {
            setState(() {
              _isDescriptionExpanded = !_isDescriptionExpanded;
            });
          },
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: const Color(0xFFF0F0F0),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFFE0E0E0)),
            ),
            child: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  _isDescriptionExpanded ? 'Show Less' : 'Show More',
                  style: GoogleFonts.poppins(
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                    color: const Color(0xFF6366F1),
                  ),
                ),
                const SizedBox(width: 4),
                Icon(
                  _isDescriptionExpanded ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down,
                  size: 16,
                  color: const Color(0xFF6366F1),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  @override
  bool get wantKeepAlive => true;
}
