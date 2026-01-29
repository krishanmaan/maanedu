class Class {
  final String id;
  final String courseId;
  final String title;
  final String videoUrl;
  final String description;
  final String? imageUrl;
  final String? muxAssetId;
  final String? muxPlaybackId;
  final int? durationMinutes;
  final int? orderIndex;
  final bool? isFree;
  final int? views;
  final DateTime createdAt;

  Class({
    required this.id,
    required this.courseId,
    required this.title,
    required this.videoUrl,
    required this.description,
    this.imageUrl,
    this.muxAssetId,
    this.muxPlaybackId,
    this.durationMinutes,
    this.orderIndex,
    this.isFree,
    this.views,
    required this.createdAt,
  });

  // Getter for backward compatibility
  // ignore: non_constant_identifier_names
  String? get image_url => imageUrl;
  // ignore: non_constant_identifier_names
  String? get mux_asset_id => muxAssetId;
  // ignore: non_constant_identifier_names
  String? get mux_playback_id => muxPlaybackId;
  // ignore: non_constant_identifier_names
  int? get duration_minutes => durationMinutes;
  // ignore: non_constant_identifier_names
  int? get order_index => orderIndex;
  // ignore: non_constant_identifier_names
  bool? get is_free => isFree;
  // ignore: non_constant_identifier_names
  int? get views_count => views;

  factory Class.fromJson(Map<String, dynamic> json) {
    return Class(
      id: json['id'] as String,
      courseId: json['course_id'] as String,
      title: json['title'] as String,
      videoUrl: json['video_url'] as String? ?? '',
      description: json['description'] as String? ?? '',
      imageUrl: json['image_url'] as String?,
      muxAssetId: json['mux_asset_id'] as String?,
      muxPlaybackId: json['mux_playback_id'] as String?,
      durationMinutes: _safeParseInt(json['duration_minutes']),
      orderIndex: _safeParseInt(json['order_index']),
      isFree: _safeParseBool(json['is_free']),
      views: _safeParseInt(json['views']),
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }

  // Safe parsing helper methods
  static int? _safeParseInt(dynamic value) {
    if (value == null) return null;
    if (value is int) return value;
    if (value is String) {
      try {
        return int.parse(value);
      } catch (e) {
        return null;
      }
    }
    if (value is double) return value.toInt();
    return null;
  }

  static bool? _safeParseBool(dynamic value) {
    if (value == null) return null;
    if (value is bool) return value;
    if (value is String) {
      if (value.toLowerCase() == 'true' || value == '1') return true;
      if (value.toLowerCase() == 'false' || value == '0') return false;
    }
    if (value is int) return value != 0;
    return null;
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'course_id': courseId,
      'title': title,
      'video_url': videoUrl,
      'description': description,
      'image_url': imageUrl,
      'mux_asset_id': muxAssetId,
      'mux_playback_id': muxPlaybackId,
      'duration_minutes': durationMinutes,
      'order_index': orderIndex,
      'is_free': isFree,
      'views': views,
      'created_at': createdAt.toIso8601String(),
    };
  }

  @override
  String toString() {
    return 'Class(id: $id, courseId: $courseId, title: $title)';
  }
}
