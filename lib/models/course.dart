class Course {
  final String id;
  final String title;
  final String description;
  final String? thumbnail;
  final String? imageUrl;
  final String? videoUrl;
  final String? muxAssetId;
  final String? muxPlaybackId;
  final String? category;
  final String? level;
  final double? price;
  final int? durationHours;
  final bool? isActive;
  final DateTime? createdAt;
  final DateTime? updatedAt;

  Course({
    required this.id,
    required this.title,
    required this.description,
    this.thumbnail,
    this.imageUrl,
    this.videoUrl,
    this.muxAssetId,
    this.muxPlaybackId,
    this.category,
    this.level,
    this.price,
    this.durationHours,
    this.isActive,
    this.createdAt,
    this.updatedAt,
  });

  factory Course.fromJson(Map<String, dynamic> json) {
    // Handle price as string or number
    double? parsePrice(dynamic priceValue) {
      if (priceValue == null) return null;
      if (priceValue is num) return priceValue.toDouble();
      if (priceValue is String) {
        try {
          return double.parse(priceValue);
        } catch (e) {
          return null;
        }
      }
      return null;
    }

    return Course(
      id: json['id'] as String,
      title: json['title'] as String,
      description: json['description'] as String,
      thumbnail: json['thumbnail'] as String?,
      imageUrl: json['image_url'] as String?,
      videoUrl: json['video_url'] as String?,
      muxAssetId: json['mux_asset_id'] as String?,
      muxPlaybackId: json['mux_playback_id'] as String?,
      category: json['category'] as String?,
      level: json['level'] as String?,
      price: parsePrice(json['price']),
      durationHours: json['duration_hours'] as int?,
      isActive: json['is_active'] as bool?,
      createdAt: json['created_at'] != null 
          ? DateTime.parse(json['created_at'] as String)
          : null,
      updatedAt: json['updated_at'] != null 
          ? DateTime.parse(json['updated_at'] as String)
          : null,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'description': description,
      'thumbnail': thumbnail,
      'image_url': imageUrl,
      'video_url': videoUrl,
      'mux_asset_id': muxAssetId,
      'mux_playback_id': muxPlaybackId,
      'category': category,
      'level': level,
      'price': price,
      'duration_hours': durationHours,
      'is_active': isActive,
      'created_at': createdAt?.toIso8601String(),
      'updated_at': updatedAt?.toIso8601String(),
    };
  }

  // Get the image URL (prefer imageUrl over thumbnail)
  String? get imageUrlOrThumbnail => imageUrl ?? thumbnail;

  // Convenience getters for backward compatibility naming
  // ignore: non_constant_identifier_names
  String? get mux_asset_id => muxAssetId;
  // ignore: non_constant_identifier_names
  String? get mux_playback_id => muxPlaybackId;

  @override
  String toString() {
    return 'Course(id: $id, title: $title, description: $description)';
  }
}
