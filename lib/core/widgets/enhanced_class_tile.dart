import 'package:flutter/material.dart';
import '../theme/app_colors.dart';
import '../theme/app_text_styles.dart';
import '../../models/class.dart';

class EnhancedClassTile extends StatelessWidget {
  final Class classItem;
  final VoidCallback onTap;
  final int index;
  final bool isCompleted;
  final bool isCurrentlyPlaying;
  final String? duration;

  const EnhancedClassTile({
    super.key,
    required this.classItem,
    required this.onTap,
    required this.index,
    this.isCompleted = false,
    this.isCurrentlyPlaying = false,
    this.duration,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: AppColors.shadowLight,
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Card(
        elevation: 0,
        margin: EdgeInsets.zero,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
        ),
        child: InkWell(
          onTap: onTap,
          borderRadius: BorderRadius.circular(16),
          child: Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(16),
              gradient: isCurrentlyPlaying
                  ? LinearGradient(
                      colors: AppColors.primaryGradient.map((c) => c.withValues(alpha: 0.1)).toList(),
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    )
                  : null,
              border: isCurrentlyPlaying
                  ? Border.all(color: AppColors.primary, width: 2)
                  : null,
            ),
            child: Row(
              children: [
                // Class Number / Status Indicator
                Container(
                  width: 48,
                  height: 48,
                  decoration: BoxDecoration(
                    color: _getStatusColor(),
                    borderRadius: BorderRadius.circular(24),
                    boxShadow: [
                      BoxShadow(
                        color: _getStatusColor().withValues(alpha: 0.3),
                        blurRadius: 8,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Center(
                    child: _getStatusIcon(),
                  ),
                ),
                const SizedBox(width: 16),
                
                // Class Info
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Expanded(
                            child: Text(
                              classItem.title,
                              style: AppTextStyles.titleMedium.copyWith(
                                fontWeight: FontWeight.w600,
                                color: isCurrentlyPlaying 
                                    ? AppColors.primary 
                                    : AppColors.onSurface,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          if (duration != null) ...[
                            const SizedBox(width: 8),
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 8,
                                vertical: 4,
                              ),
                              decoration: BoxDecoration(
                                color: AppColors.grey200,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(
                                duration!,
                                style: AppTextStyles.labelSmall.copyWith(
                                  color: AppColors.grey700,
                                ),
                              ),
                            ),
                          ],
                        ],
                      ),
                      const SizedBox(height: 6),
                      Text(
                        classItem.description,
                        style: AppTextStyles.bodySmall.copyWith(
                          color: AppColors.onSurfaceVariant,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 8),
                      
                      // Tags
                      Row(
                        children: [
                          _buildTag('Class ${index + 1}', AppColors.info),
                          const SizedBox(width: 8),
                          if (isCompleted)
                            _buildTag('Completed', AppColors.success)
                          else if (isCurrentlyPlaying)
                            _buildTag('Playing', AppColors.primary)
                          else
                            _buildTag('Not Started', AppColors.grey500),
                        ],
                      ),
                    ],
                  ),
                ),
                
                // Action Button
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: _getActionButtonColor(),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Icon(
                    _getActionIcon(),
                    color: Colors.white,
                    size: 20,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildTag(String text, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Text(
        text,
        style: AppTextStyles.labelSmall.copyWith(
          color: color,
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }

  Color _getStatusColor() {
    if (isCompleted) return AppColors.success;
    if (isCurrentlyPlaying) return AppColors.primary;
    return AppColors.grey400;
  }

  Widget _getStatusIcon() {
    if (isCompleted) {
      return Icon(
        Icons.check,
        color: Colors.white,
        size: 24,
      );
    }
    if (isCurrentlyPlaying) {
      return Icon(
        Icons.play_arrow,
        color: Colors.white,
        size: 24,
      );
    }
    return Text(
      '${index + 1}',
      style: AppTextStyles.titleMedium.copyWith(
        color: Colors.white,
        fontWeight: FontWeight.bold,
      ),
    );
  }

  Color _getActionButtonColor() {
    if (isCurrentlyPlaying) return AppColors.primary;
    if (isCompleted) return AppColors.success;
    return AppColors.grey500;
  }

  IconData _getActionIcon() {
    if (isCurrentlyPlaying) return Icons.pause;
    if (isCompleted) return Icons.replay;
    return Icons.play_arrow;
  }
}
