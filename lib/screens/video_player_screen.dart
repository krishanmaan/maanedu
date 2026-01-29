// Removed unused app_router import
import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:go_router/go_router.dart';
import 'package:youtube_player_flutter/youtube_player_flutter.dart';
import 'package:chewie/chewie.dart';
import 'package:video_player/video_player.dart';
import 'package:path_provider/path_provider.dart';
import '../providers/course_provider.dart';
import '../utils/video_utils.dart';
import '../utils/constants.dart';
import '../services/supabase_service.dart';

class VideoPlayerScreen extends StatefulWidget {
  final String classId;

  const VideoPlayerScreen({
    super.key,
    required this.classId,
  });

  @override
  State<VideoPlayerScreen> createState() => _VideoPlayerScreenState();
}

class _VideoPlayerScreenState extends State<VideoPlayerScreen> with WidgetsBindingObserver, AutomaticKeepAliveClientMixin<VideoPlayerScreen> {
  YoutubePlayerController? _youtubeController;
  VideoPlayerController? _videoController;
  ChewieController? _chewieController;
  bool _isLoading = true;
  String? _errorMessage;
  bool _hasInitialized = false;

  void _pauseAll() {
    try {
      _youtubeController?.pause();
    } catch (_) {}
    try {
      if (_videoController != null && _videoController!.value.isPlaying) {
        _videoController!.pause();
      }
    } catch (_) {}
    try {
      _chewieController?.pause();
    } catch (_) {}
  }

  String? _extractYouTubeId(String url) {
    try {
      // Direct ID provided
      final directId = RegExp(r'^[a-zA-Z0-9_-]{6,}$');
      if (directId.hasMatch(url)) return url;

      final uri = Uri.parse(url);
      final host = uri.host.toLowerCase();

      // youtu.be/<id>
      if (host == 'youtu.be') {
        final seg = uri.pathSegments.isNotEmpty ? uri.pathSegments.first : '';
        return seg.isNotEmpty ? seg : null;
      }

      if (host.contains('youtube.com')) {
        // /watch?v=<id>
        final v = uri.queryParameters['v'];
        if (v != null && v.isNotEmpty) return v;

        // /live/<id>, /embed/<id>, /shorts/<id>
        if (uri.pathSegments.isNotEmpty) {
          final first = uri.pathSegments.first;
          if (['live', 'embed', 'shorts'].contains(first) && uri.pathSegments.length >= 2) {
            final id = uri.pathSegments[1];
            if (id.isNotEmpty) return id;
          }
        }
      }
    } catch (_) {
      // ignore
    }
    return null;
  }

  // If user pasted an entire <iframe ... src="..."> snippet, extract the src URL
  String _normalizeExternalVideoUrl(String input) {
    final trimmed = input.trim();
    if (trimmed.startsWith('<')) {
      // likely HTML snippet
      final match = RegExp(r'src\s*=\s*"([^"]+)"', caseSensitive: false).firstMatch(trimmed);
      if (match != null && match.groupCount >= 1) {
        return match.group(1)!.trim();
      }
      final matchSingle = RegExp(r"src\s*=\s*'([^']+)'", caseSensitive: false).firstMatch(trimmed);
      if (matchSingle != null && matchSingle.groupCount >= 1) {
        return matchSingle.group(1)!.trim();
      }
    }
    return trimmed;
  }

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_hasInitialized) return;
      _hasInitialized = true;
      _loadClassAndInitializePlayer();
    });
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.inactive || state == AppLifecycleState.paused || state == AppLifecycleState.detached || state == AppLifecycleState.hidden) {
      _pauseAll();
    }
  }

  @override
  void deactivate() {
    _pauseAll();
    super.deactivate();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // Pause playback if a new route is pushed over this one
    final route = ModalRoute.of(context);
    route?.addScopedWillPopCallback(() async {
      _pauseAll();
      return true;
    });
  }

  // Removed duplicate dispose at the bottom; single dispose is defined earlier

  Future<void> _loadClassAndInitializePlayer() async {
    try {
      final courseProvider = context.read<CourseProvider>();
      await courseProvider.loadClass(widget.classId);
      
      final classItem = courseProvider.selectedClass;
      if (classItem != null) {
        // Check if we have a specific Mux playback ID
        String videoUrl = classItem.videoUrl;
        
        // Handle Mux videos properly
        if (videoUrl.startsWith('mux://')) {
          if (classItem.muxPlaybackId != null && classItem.muxPlaybackId!.isNotEmpty) {
            // Use the playback ID for streaming
            videoUrl = 'mux://${classItem.muxPlaybackId}';
            if (kDebugMode) {
              debugPrint('🔄 Using playback ID for streaming: ${classItem.muxPlaybackId}');
            }
          } else {
            // Video is still processing or playback ID is missing
            setState(() {
              _errorMessage = 'Video is still processing on Mux. Please try again in a few minutes.';
              _isLoading = false;
            });
            return;
          }
        }
        
        await _initializePlayer(videoUrl);
      } else {
        setState(() {
          _errorMessage = 'Class not found';
          _isLoading = false;
        });
      }
    } catch (e) {
      setState(() {
        _errorMessage = e.toString();
        _isLoading = false;
      });
    }
  }


  Future<void> _initializeBase64Video(String base64VideoUrl) async {
    try {
      if (kDebugMode) {
        debugPrint('🔄 Converting base64 video to file...');
      }
      
      // Extract base64 data from data URL
      final base64Data = base64VideoUrl.split(',')[1];
      final bytes = base64Decode(base64Data);
      
      // Get temporary directory
      final tempDir = await getTemporaryDirectory();
      final videoFile = File('${tempDir.path}/temp_video_${DateTime.now().millisecondsSinceEpoch}.mp4');
      
      // Write video bytes to file
      await videoFile.writeAsBytes(bytes);
      
      if (kDebugMode) {
        debugPrint('✅ Video file created: ${videoFile.path}');
        debugPrint('📁 File size: ${bytes.length} bytes');
      }
      
      // Initialize video player with file
      _videoController = VideoPlayerController.file(videoFile);
      await _videoController!.initialize();
      
      if (mounted) {
        _chewieController = ChewieController(
          videoPlayerController: _videoController!,
          autoPlay: false,
          looping: false,
          allowFullScreen: true,
          allowMuting: true,
          showControls: true,
          materialProgressColors: ChewieProgressColors(
            playedColor: Theme.of(context).colorScheme.primary,
            handleColor: Theme.of(context).colorScheme.primary,
            backgroundColor: Colors.grey,
            bufferedColor: Colors.grey[300]!,
          ),
        );
        
        if (kDebugMode) {
          debugPrint('✅ Base64 video player initialized successfully');
        }
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('❌ Error processing base64 video: $e');
      }
      throw Exception('Failed to process base64 video: $e');
    }
  }



  Future<void> _initializePlayer(String videoUrl) async {
    try {
      // Normalize if full <iframe> snippet was provided
      videoUrl = _normalizeExternalVideoUrl(videoUrl);

      final videoType = VideoUtils.getVideoType(videoUrl);
      
      if (kDebugMode) {
        debugPrint('🎬 Initializing video player');
        debugPrint('🔗 Video URL: ${videoUrl.length > 100 ? "${videoUrl.substring(0, 100)}..." : videoUrl}');
      }
      
      // Force YouTube handling for any youtube URL variants before relying on VideoUtils
      if (videoUrl.contains('youtube.com') || videoUrl.contains('youtu.be')) {
        final id = _extractYouTubeId(videoUrl);
        if (id != null) {
          _youtubeController = YoutubePlayerController(
            initialVideoId: id,
            flags: const YoutubePlayerFlags(
              autoPlay: false,
              mute: false,
              enableCaption: false,
              controlsVisibleAtStart: true,
              hideThumbnail: true,
              useHybridComposition: true,
            ),
          );
          if (mounted) {
            setState(() {});
          }
          // Continue to finalize below
        } else {
          throw Exception('Invalid YouTube URL');
        }
        if (mounted) {
          setState(() {
            _isLoading = false;
          });
          _incrementViewCount();
        }
        return;
      }

      switch (videoType) {
        case VideoType.youtube:
          final videoId = _extractYouTubeId(videoUrl) ?? VideoUtils.extractYouTubeVideoId(videoUrl);
          if (videoId != null) {
            _youtubeController = YoutubePlayerController(
              initialVideoId: videoId,
              flags: const YoutubePlayerFlags(
                autoPlay: false,
                mute: false,
                enableCaption: false,
                controlsVisibleAtStart: true,
                hideThumbnail: true,
                useHybridComposition: true,
              ),
            );
          } else {
            throw Exception('Invalid YouTube URL');
          }
          break;
          
        case VideoType.base64:
          await _initializeBase64Video(videoUrl);
          break;

        case VideoType.mux:
          await _initializeMuxVideo(videoUrl);
          break;
          
        case VideoType.vimeo:
        case VideoType.direct:
          _videoController = VideoPlayerController.networkUrl(Uri.parse(videoUrl));
          await _videoController!.initialize();
          
          if (mounted) {
            _chewieController = ChewieController(
              videoPlayerController: _videoController!,
              autoPlay: false,
              looping: false,
              allowFullScreen: true,
              allowMuting: true,
              showControls: true,
              materialProgressColors: ChewieProgressColors(
                playedColor: Theme.of(context).colorScheme.primary,
                handleColor: Theme.of(context).colorScheme.primary,
                backgroundColor: Colors.grey,
                bufferedColor: Colors.grey[300]!,
              ),
            );
          }
          break;
      }
      
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
        
        // Increment view count when video is loaded
        _incrementViewCount();
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('❌ Error initializing player: $e');
      }
      if (mounted) {
        setState(() {
          _errorMessage = 'Failed to load video: $e';
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _initializeMuxVideo(String muxVideoUrl) async {
    try {
      if (kDebugMode) {
        debugPrint('🎬 Initializing Mux video player');
        debugPrint('🔗 Mux URL: $muxVideoUrl');
      }
      
      // Extract playback ID from mux:// URL
      final playbackId = VideoUtils.extractMuxPlaybackId(muxVideoUrl);
      if (playbackId == null || playbackId.isEmpty) {
        throw Exception('Invalid Mux URL format: $muxVideoUrl');
      }
      
      if (kDebugMode) {
        debugPrint('🎥 Mux Playback ID: $playbackId');
      }
      
      // Get HLS stream URL from Mux (adaptive streaming)
      final hlsUrl = VideoUtils.getMuxStreamUrl(playbackId);
      
      if (kDebugMode) {
        debugPrint('🔄 HLS Stream URL: $hlsUrl');
      }
      
      // Initialize video player with HLS stream
      _videoController = VideoPlayerController.networkUrl(Uri.parse(hlsUrl));
      
      // Add error listener
      _videoController!.addListener(() {
        if (_videoController!.value.hasError) {
          if (kDebugMode) {
            debugPrint('❌ Video Controller Error: ${_videoController!.value.errorDescription}');
          }
        }
      });
      
      await _videoController!.initialize();
      
      if (kDebugMode) {
        debugPrint('✅ Video controller initialized');
        debugPrint('📊 Video info: ${_videoController!.value.duration}, ${_videoController!.value.size}');
      }
      
      if (mounted) {
        _chewieController = ChewieController(
          videoPlayerController: _videoController!,
          autoPlay: false,
          looping: false,
          allowFullScreen: true,
          allowMuting: true,
          showControls: true,
          materialProgressColors: ChewieProgressColors(
            playedColor: Theme.of(context).colorScheme.primary,
            handleColor: Theme.of(context).colorScheme.primary,
            backgroundColor: Colors.grey,
            bufferedColor: Colors.grey[300]!,
          ),
        );
        
        if (kDebugMode) {
          debugPrint('✅ Mux video player initialized successfully');
        }
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('❌ Error processing Mux video: $e');
        debugPrint('🔍 Full error details: ${e.runtimeType} - $e');
      }
      
      // Provide more specific error message
      String errorMessage = 'Failed to load Mux video';
      if (e.toString().contains('processing')) {
        errorMessage = 'Video is still processing. Please try again in a few minutes.';
      } else if (e.toString().contains('network') || e.toString().contains('connection')) {
        errorMessage = 'Network error. Please check your internet connection.';
      } else if (e.toString().contains('format')) {
        errorMessage = 'Invalid video format or URL.';
      }
      
      throw Exception(errorMessage);
    }
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _youtubeController?.dispose();
    _videoController?.dispose();
    _chewieController?.dispose();
    super.dispose();
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
          context.push(AppConstants.onlineCoursesRoute);
        }
      },
      child: Scaffold(
      backgroundColor: Colors.white,
      appBar: AppBar(
        backgroundColor: Colors.white,
        surfaceTintColor: Colors.white,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.black, size: 24),
          onPressed: () {
            if (context.canPop()) {
              context.pop();
            } else {
              context.push(AppConstants.onlineCoursesRoute);
            }
          },
        ),
        title: Consumer<CourseProvider>(
          builder: (context, courseProvider, _) {
            return Text(
              courseProvider.selectedClass?.title ?? 'Video Player',
              style: GoogleFonts.poppins(
                color: Colors.black,
                fontWeight: FontWeight.w500,
                fontSize: 18,
              ),
            );
          },
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.more_vert, color: Colors.black, size: 24),
            onPressed: () {
              // Menu functionality
            },
          ),
        ],
        elevation: 0,
        systemOverlayStyle: SystemUiOverlayStyle.dark,
      ),
      body: Consumer<CourseProvider>(
        builder: (context, courseProvider, _) {
          final classItem = courseProvider.selectedClass;
          
          if (_isLoading) {
            return Container(
              color: Colors.white,
              child: Center(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    const CircularProgressIndicator(
                      color: Colors.black,
                      strokeWidth: 2,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Loading video...',
                      style: GoogleFonts.poppins(
                        fontSize: 16,
                        fontWeight: FontWeight.w400,
                        color: Colors.black54,
                      ),
                    ),
                  ],
                ),
              ),
            );
          }
          
          if (_errorMessage != null) {
            return _buildErrorWidget();
          }
          
          if (classItem == null) {
            return _buildErrorWidget('Class not found');
          }
          
          return SingleChildScrollView(
            child: Column(
              children: [
                // Video Player
                RepaintBoundary(child: AspectRatio(
                  aspectRatio: 16 / 9,
                  child: Container(
                    color: Colors.black,
                    child: _buildVideoPlayer(),
                  ),
                )),
                
                // Video Details Section
                Container(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Title
                      Text(
                        classItem.title,
                        style: GoogleFonts.poppins(
                          fontSize: 18,
                          fontWeight: FontWeight.w600,
                          color: Colors.black,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 8),
                      
                      // Views and Upload Time
                      Builder(
                        builder: (context) {
                          if (kDebugMode) {
                            debugPrint('📊 Class views data: ${classItem.views}');
                            debugPrint('📊 Class title: ${classItem.title}');
                            debugPrint('📊 Class ID: ${classItem.id}');
                          }
                          return Row(
                            children: [
                              Text(
                                '${_formatViews(classItem.views ?? 0)} views',
                                style: GoogleFonts.poppins(
                                  fontSize: 14,
                                  color: Colors.black54,
                                ),
                              ),
                              const SizedBox(width: 8),
                              Text(
                                '•',
                                style: GoogleFonts.poppins(
                                  fontSize: 14,
                                  color: Colors.black54,
                                ),
                              ),
                              const SizedBox(width: 8),
                              Text(
                                '${_getUploadTime(classItem.createdAt)} ago',
                                style: GoogleFonts.poppins(
                                  fontSize: 14,
                                  color: Colors.black54,
                                ),
                              ),
                            ],
                          );
                        },
                      ),
                      const SizedBox(height: 16),
                      
                      // Description with More button
                      _buildDescriptionSection(classItem),
                      
                      // Debug: Test view increment button
                      if (kDebugMode) ...[
                        const SizedBox(height: 16),
                        Row(
                          children: [
                            ElevatedButton(
                              onPressed: () async {
                                await _incrementViewCount();
                              },
                              child: const Text('Test View Increment'),
                            ),
                            const SizedBox(width: 8),
                            ElevatedButton(
                              onPressed: () {
                                context.go('/debug-views');
                              },
                              child: const Text('Debug Views'),
                            ),
                          ],
                        ),
                      ],
                    ],
                  ),
                ),
                
                // Course Video Suggestions
                _buildCourseVideoSuggestions(),
              ],
            ),
          );
        },
      ),
    ));
  }

  Widget _buildVideoPlayer() {
    if (_youtubeController != null) {
      return RepaintBoundary(child: YoutubePlayer(
        controller: _youtubeController!,
        showVideoProgressIndicator: true,
        progressIndicatorColor: Theme.of(context).colorScheme.primary,
        bottomActions: [
          CurrentPosition(),
          ProgressBar(
            isExpanded: true,
            colors: ProgressBarColors(
              playedColor: Theme.of(context).colorScheme.primary,
              handleColor: Theme.of(context).colorScheme.primary,
            ),
          ),
          RemainingDuration(),
          FullScreenButton(),
        ],
      ));
    } else if (_chewieController != null) {
      return RepaintBoundary(child: Stack(
        children: [
          Chewie(
            controller: _chewieController!,
          ),
        ],
      ));
    } else {
      return Container(
        color: Colors.black,
        child: const Center(
          child: CircularProgressIndicator(
            color: Colors.white,
          ),
        ),
      );
    }
  }



  Widget _buildCourseVideoSuggestions() {
    return Consumer<CourseProvider>(
      builder: (context, courseProvider, _) {
        final currentClass = courseProvider.selectedClass;
        if (currentClass == null) return const SizedBox();
        
        // Get other classes from the same course
        final courseClasses = courseProvider.classes
            .where((cls) => cls.courseId == currentClass.courseId && cls.id != currentClass.id)
            .take(5) // Show max 5 suggestions
            .toList();
        
        if (courseClasses.isEmpty) {
          return const SizedBox();
        }
        
        return Container(
          margin: const EdgeInsets.symmetric(horizontal: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const SizedBox(height: 16),
              Text(
                'More from this course',
                style: GoogleFonts.poppins(
                  fontSize: 16,
                  fontWeight: FontWeight.w600,
                  color: Colors.black,
                ),
              ),
              const SizedBox(height: 12),
              ...courseClasses.map((cls) => _buildVideoSuggestionItem(cls)),
              const SizedBox(height: 16),
            ],
          ),
        );
      },
    );
  }

  Widget _buildVideoSuggestionItem(dynamic classItem) {
    return Container(
      margin: const EdgeInsets.only(bottom: 20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.06),
            blurRadius: 8,
            offset: const Offset(0, 2),
            spreadRadius: 0,
          ),
        ],
        border: Border.all(
          color: Colors.grey.withValues(alpha: 0.15),
          width: 1,
        ),
      ),
      child: InkWell(
        onTap: () {
          _pauseAll();
          // Navigate to the selected video
          context.push('/video-player/${classItem.id}');
        },
        borderRadius: BorderRadius.circular(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Full width thumbnail with duration overlay
            Container(
              width: double.infinity,
              height: 200,
              decoration: BoxDecoration(
                color: Colors.grey[300],
                borderRadius: const BorderRadius.only(
                  topLeft: Radius.circular(12),
                  topRight: Radius.circular(12),
                ),
              ),
              child: Stack(
                children: [
                  // Thumbnail image
                  ClipRRect(
                    borderRadius: const BorderRadius.only(
                      topLeft: Radius.circular(12),
                      topRight: Radius.circular(12),
                    ),
                    child: classItem.imageUrl != null && classItem.imageUrl!.isNotEmpty
                        ? _buildImageWidget(classItem.imageUrl!)
                        : Container(
                            width: double.infinity,
                            height: 200,
                            color: Colors.grey[300],
                            child: const Icon(
                              Icons.play_circle_outline,
                              color: Colors.grey,
                              size: 48,
                            ),
                          ),
                  ),
                  // Play button overlay
                  Positioned(
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    child: Container(
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.3),
                        borderRadius: const BorderRadius.only(
                          topLeft: Radius.circular(12),
                          topRight: Radius.circular(12),
                        ),
                      ),
                      child: const Center(
                        child: Icon(
                          Icons.play_circle_filled,
                          color: Colors.white,
                          size: 60,
                        ),
                      ),
                    ),
                  ),
                  // Duration overlay
                  Positioned(
                    bottom: 12,
                    right: 12,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.85),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        _formatDuration(classItem.duration_minutes ?? 0),
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 12,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
            // Video Info
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    classItem.title,
                    style: GoogleFonts.poppins(
                      fontSize: 16,
                      fontWeight: FontWeight.w600,
                      color: Colors.black87,
                      height: 1.3,
                    ),
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      Icon(
                        Icons.access_time,
                        size: 14,
                        color: Colors.grey[600],
                      ),
                      const SizedBox(width: 4),
                      Text(
                        '${classItem.duration_minutes ?? 30} minutes',
                        style: GoogleFonts.poppins(
                          fontSize: 13,
                          color: Colors.grey[600],
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      const Spacer(),
                      Icon(
                        Icons.play_arrow,
                        size: 16,
                        color: Colors.grey[500],
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  String _formatDuration(int minutes) {
    if (minutes < 60) {
      return '${minutes}m';
    } else {
      int hours = minutes ~/ 60;
      int remainingMinutes = minutes % 60;
      return '${hours}h ${remainingMinutes}m';
    }
  }

  String _formatViews(int views) {
    if (views >= 1000000) {
      return '${(views / 1000000).toStringAsFixed(1)}M';
    } else if (views >= 1000) {
      return '${(views / 1000).toStringAsFixed(1)}K';
    } else {
      return views.toString();
    }
  }

  Future<void> _incrementViewCount() async {
    try {
      if (kDebugMode) {
        debugPrint('📈 Starting view count increment for class: ${widget.classId}');
      }
      
      // Test the increment function
      await SupabaseService.instance.incrementClassViews(widget.classId);
      
      if (kDebugMode) {
        debugPrint('✅ View count increment call completed for class: ${widget.classId}');
      }
      
      // Wait a moment for the database update to complete
      await Future.delayed(const Duration(seconds: 1));
      
      // Refresh the class data to get updated view count
      if (mounted) {
        final courseProvider = Provider.of<CourseProvider>(context, listen: false);
        await courseProvider.refreshClasses();
        
        if (kDebugMode) {
          debugPrint('🔄 Refreshed classes data');
        }
      }
    } catch (e) {
      if (kDebugMode) {
        debugPrint('❌ Error incrementing view count: $e');
        debugPrint('❌ Stack trace: ${StackTrace.current}');
      }
    }
  }

  String _getUploadTime(DateTime createdAt) {
    final now = DateTime.now();
    final difference = now.difference(createdAt);
    
    if (difference.inDays > 365) {
      final years = (difference.inDays / 365).floor();
      return years == 1 ? '1 year' : '$years years';
    } else if (difference.inDays > 30) {
      final months = (difference.inDays / 30).floor();
      return months == 1 ? '1 month' : '$months months';
    } else if (difference.inDays > 7) {
      final weeks = (difference.inDays / 7).floor();
      return weeks == 1 ? '1 week' : '$weeks weeks';
    } else if (difference.inDays > 0) {
      return difference.inDays == 1 ? '1 day' : '${difference.inDays} days';
    } else if (difference.inHours > 0) {
      return difference.inHours == 1 ? '1 hour' : '${difference.inHours} hours';
    } else if (difference.inMinutes > 0) {
      return difference.inMinutes == 1 ? '1 minute' : '${difference.inMinutes} minutes';
    } else {
      return 'just now';
    }
  }

  Widget _buildDescriptionSection(dynamic classItem) {
    return _DescriptionWidget(description: classItem.description);
  }

  Widget _buildImageWidget(String imageUrl) {
    // Check if it's a base64 data URI
    if (imageUrl.startsWith('data:image/')) {
      try {
        // Extract base64 data from data URI
        final base64String = imageUrl.split(',')[1];
        final bytes = base64Decode(base64String);
        return Image.memory(
          bytes,
          width: double.infinity,
          height: 200,
          fit: BoxFit.cover,
          errorBuilder: (context, error, stackTrace) {
            return Container(
              width: double.infinity,
              height: 200,
              color: Colors.grey[300],
              child: const Icon(
                Icons.play_circle_outline,
                color: Colors.grey,
                size: 48,
              ),
            );
          },
        );
      } catch (e) {
        // If base64 decoding fails, show error
        return Container(
          width: double.infinity,
          height: 200,
          color: Colors.grey[300],
          child: const Icon(
            Icons.play_circle_outline,
            color: Colors.grey,
            size: 48,
          ),
        );
      }
    } else {
      // Regular network URL
      return Image.network(
        imageUrl,
        width: double.infinity,
        height: 200,
        fit: BoxFit.cover,
        loadingBuilder: (context, child, loadingProgress) {
          if (loadingProgress == null) return child;
          return Container(
            width: double.infinity,
            height: 200,
            color: Colors.grey[300],
            child: const Center(
              child: CircularProgressIndicator(
                strokeWidth: 2,
                valueColor: AlwaysStoppedAnimation<Color>(Colors.grey),
              ),
            ),
          );
        },
        errorBuilder: (context, error, stackTrace) {
          return Container(
            width: double.infinity,
            height: 200,
            color: Colors.grey[300],
            child: const Icon(
              Icons.play_circle_outline,
              color: Colors.grey,
              size: 48,
            ),
          );
        },
      );
    }
  }

  Widget _buildErrorWidget([String? message]) {
    final errorText = message ?? _errorMessage ?? 'Failed to load video';
    final isProcessingError = errorText.contains('processing');
    
    return Container(
      color: Colors.white,
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                isProcessingError ? Icons.hourglass_empty : Icons.error_outline,
                size: 64,
                color: Colors.black54,
              ),
              const SizedBox(height: 16),
              Text(
                isProcessingError ? 'Video Processing' : 'Video Error',
                style: GoogleFonts.poppins(
                  fontSize: 18,
                  fontWeight: FontWeight.w600,
                  color: Colors.black,
                ),
              ),
              const SizedBox(height: 8),
              Text(
                errorText,
                style: GoogleFonts.poppins(
                  fontSize: 14,
                  color: Colors.black54,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: () {
                  setState(() {
                    _isLoading = true;
                    _errorMessage = null;
                  });
                  _loadClassAndInitializePlayer();
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.black,
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                child: Text(
                  isProcessingError ? 'Check Status' : 'Retry',
                  style: GoogleFonts.poppins(
                    fontWeight: FontWeight.w500,
                    fontSize: 14,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  bool get wantKeepAlive => true;
}

class _DescriptionWidget extends StatefulWidget {
  final String description;

  const _DescriptionWidget({required this.description});

  @override
  State<_DescriptionWidget> createState() => _DescriptionWidgetState();
}

class _DescriptionWidgetState extends State<_DescriptionWidget> {
  bool isExpanded = false;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // Description text
        Text(
          widget.description,
          style: GoogleFonts.poppins(
            fontSize: 14,
            color: Colors.black87,
            height: 1.5,
          ),
          maxLines: isExpanded ? null : 1,
          overflow: isExpanded ? null : TextOverflow.ellipsis,
        ),
        
        // More/Less button
        if (widget.description.length > 10)
          GestureDetector(
            onTap: () {
              setState(() {
                isExpanded = !isExpanded;
              });
            },
            child: Padding(
              padding: const EdgeInsets.only(top: 8),
              child: Text(
                isExpanded ? 'Show less' : 'Show more',
                style: GoogleFonts.poppins(
                  fontSize: 14,
                  color: Colors.black54,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
          ),
      ],
    );
  }
}
