import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../models/course.dart';

class CourseCard extends StatelessWidget {
  final Course course;
  final VoidCallback onTap;
  final int? classesCount;

  const CourseCard({
    super.key,
    required this.course,
    required this.onTap,
    this.classesCount,
  });

  @override
  Widget build(BuildContext context) {
    // Debug: Print image URL information
    if (kDebugMode && course.imageUrlOrThumbnail != null) {
      debugPrint('🖼️ Course "${course.title}" has image URL: ${course.imageUrlOrThumbnail}');
    }
    
    // Generate a random color for the gradient
    final gradientColors = [
      [const Color(0xFF6366F1), const Color(0xFF8B5CF6)], // Purple
      [const Color(0xFFEC4899), const Color(0xFFF59E0B)], // Pink to Orange
      [const Color(0xFF059669), const Color(0xFF10B981)], // Green
      [const Color(0xFF3B82F6), const Color(0xFF1D4ED8)], // Blue
      [const Color(0xFFEF4444), const Color(0xFFF97316)], // Red to Orange
    ];
    
    final colorIndex = course.id.hashCode % gradientColors.length;
    final selectedColors = gradientColors[colorIndex];
    
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.08),
            blurRadius: 15,
            offset: const Offset(0, 5),
          ),
        ],
      ),
      child: ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: InkWell(
          onTap: onTap,
          child: Container(
            decoration: BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: selectedColors,
              ),
            ),
            child: Column(
              children: [
                // Course Image Section (Full width)
                Expanded(
                  flex: 3,
                  child: Stack(
                    children: [
                      // Background Image
                      if (course.imageUrlOrThumbnail != null)
                        Positioned.fill(
                          child: ClipRRect(
                            borderRadius: const BorderRadius.only(
                              topLeft: Radius.circular(20),
                              topRight: Radius.circular(20),
                            ),
                            child: _buildCourseImage(course.imageUrlOrThumbnail!, selectedColors),
                          ),
                        ),
                      
                      // Gradient Overlay for better text readability
                      Positioned.fill(
                        child: Container(
                          decoration: BoxDecoration(
                            borderRadius: const BorderRadius.only(
                              topLeft: Radius.circular(20),
                              topRight: Radius.circular(20),
                            ),
                            gradient: LinearGradient(
                              begin: Alignment.topCenter,
                              end: Alignment.bottomCenter,
                              colors: [
                                Colors.black.withValues(alpha: 0.2),
                                Colors.transparent,
                                Colors.black.withValues(alpha: 0.3),
                              ],
                            ),
                          ),
                        ),
                      ),
                      
                      // Star Rating in top-left corner
                      Positioned(
                        top: 12,
                        left: 12,
                        child: Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 8,
                            vertical: 4,
                          ),
                          decoration: BoxDecoration(
                            color: Colors.black.withValues(alpha: 0.4),
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(
                              color: Colors.white.withValues(alpha: 0.3),
                            ),
                          ),
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const Icon(
                                Icons.star,
                                color: Colors.amber,
                                size: 12,
                              ),
                              const SizedBox(width: 4),
                              Text(
                                '5.0',
                                style: GoogleFonts.poppins(
                                  color: Colors.white,
                                  fontSize: 10,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                      
                      // Category icon if no image
                      if (course.imageUrlOrThumbnail == null)
                        Center(
                          child: Container(
                            width: 60,
                            height: 60,
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.2),
                              borderRadius: BorderRadius.circular(30),
                            ),
                            child: Icon(
                              _getCourseIcon(course.category ?? course.title),
                              color: Colors.white,
                              size: 30,
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
                
                // Course Details Section (Below image)
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(16),
                  decoration: const BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.only(
                      bottomLeft: Radius.circular(20),
                      bottomRight: Radius.circular(20),
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        course.title,
                        style: GoogleFonts.poppins(
                          fontSize: 16,
                          fontWeight: FontWeight.w600,
                          color: Colors.black87,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 6),
                      Text(
                        '${classesCount ?? 25} Classes',
                        style: GoogleFonts.poppins(
                          fontSize: 14,
                          color: Colors.grey[600],
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
  
  Widget _buildCourseImage(String imageUrl, List<Color> fallbackColors) {
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
              debugPrint('❌ Error loading base64 image: $error');
            }
            return _buildFallbackGradient(fallbackColors);
          },
        );
      } catch (e) {
        if (kDebugMode) {
          debugPrint('❌ Error parsing base64 image: $e');
        }
        return _buildFallbackGradient(fallbackColors);
      }
    } else {
      // Regular network image URL
      return CachedNetworkImage(
        imageUrl: imageUrl,
        fit: BoxFit.cover,
        placeholder: (context, url) => Container(
          decoration: BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: fallbackColors,
            ),
          ),
          child: Center(
            child: CircularProgressIndicator(
              color: Colors.white.withValues(alpha: 0.7),
              strokeWidth: 2,
            ),
          ),
        ),
        errorWidget: (context, url, error) {
          if (kDebugMode) {
            debugPrint('❌ Error loading network image: $error');
          }
          return _buildFallbackGradient(fallbackColors);
        },
      );
    }
  }
  
  Widget _buildFallbackGradient(List<Color> colors) {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: colors,
        ),
      ),
      child: Center(
        child: Icon(
          _getCourseIcon(course.category ?? course.title),
          color: Colors.white,
          size: 30,
        ),
      ),
    );
  }

  IconData _getCourseIcon(String courseInfo) {
    final lowerInfo = courseInfo.toLowerCase();
    
    if (lowerInfo.contains('development') || lowerInfo.contains('programming') || lowerInfo.contains('coding')) {
      return Icons.code;
    } else if (lowerInfo.contains('design') || lowerInfo.contains('ui') || lowerInfo.contains('ux')) {
      return Icons.palette;
    } else if (lowerInfo.contains('business') || lowerInfo.contains('marketing') || lowerInfo.contains('finance')) {
      return Icons.business_center;
    } else if (lowerInfo.contains('data') || lowerInfo.contains('analytics') || lowerInfo.contains('science')) {
      return Icons.analytics;
    } else if (lowerInfo.contains('music') || lowerInfo.contains('audio')) {
      return Icons.music_note;
    } else if (lowerInfo.contains('photo') || lowerInfo.contains('video') || lowerInfo.contains('media')) {
      return Icons.videocam;
    } else if (lowerInfo.contains('language') || lowerInfo.contains('english')) {
      return Icons.translate;
    } else if (lowerInfo.contains('health') || lowerInfo.contains('fitness')) {
      return Icons.favorite;
    } else {
      return Icons.school;
    }
  }
}
