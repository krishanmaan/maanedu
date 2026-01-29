class Banner {
  final String id;
  final String title;
  final String? subtitle;
  final String? description;
  final String imageUrl;
  final String backgroundColor;
  final String textColor;
  final String? badgeText;
  final String badgeColor;
  final bool isActive;
  final int displayOrder;
  final String? targetRoute;
  final DateTime createdAt;
  final DateTime updatedAt;

  Banner({
    required this.id,
    required this.title,
    this.subtitle,
    this.description,
    required this.imageUrl,
    required this.backgroundColor,
    required this.textColor,
    this.badgeText,
    required this.badgeColor,
    required this.isActive,
    required this.displayOrder,
    this.targetRoute,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Banner.fromJson(Map<String, dynamic> json) {
    return Banner(
      id: json['id'] as String,
      title: json['title'] as String,
      subtitle: json['subtitle'] as String?,
      description: json['description'] as String?,
      imageUrl: json['image_url'] as String,
      backgroundColor: json['background_color'] as String? ?? '#6D57FC',
      textColor: json['text_color'] as String? ?? '#FFFFFF',
      badgeText: json['badge_text'] as String?,
      badgeColor: json['badge_color'] as String? ?? '#FF9800',
      isActive: json['is_active'] as bool? ?? true,
      displayOrder: json['display_order'] as int? ?? 0,
      targetRoute: json['target_route'] as String?,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'subtitle': subtitle,
      'description': description,
      'image_url': imageUrl,
      'background_color': backgroundColor,
      'text_color': textColor,
      'badge_text': badgeText,
      'badge_color': badgeColor,
      'is_active': isActive,
      'display_order': displayOrder,
      'target_route': targetRoute,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };
  }

  Banner copyWith({
    String? id,
    String? title,
    String? subtitle,
    String? description,
    String? imageUrl,
    String? backgroundColor,
    String? textColor,
    String? badgeText,
    String? badgeColor,
    bool? isActive,
    int? displayOrder,
    String? targetRoute,
    DateTime? createdAt,
    DateTime? updatedAt,
  }) {
    return Banner(
      id: id ?? this.id,
      title: title ?? this.title,
      subtitle: subtitle ?? this.subtitle,
      description: description ?? this.description,
      imageUrl: imageUrl ?? this.imageUrl,
      backgroundColor: backgroundColor ?? this.backgroundColor,
      textColor: textColor ?? this.textColor,
      badgeText: badgeText ?? this.badgeText,
      badgeColor: badgeColor ?? this.badgeColor,
      isActive: isActive ?? this.isActive,
      displayOrder: displayOrder ?? this.displayOrder,
      targetRoute: targetRoute ?? this.targetRoute,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
    );
  }

  @override
  String toString() {
    return 'Banner(id: $id, title: $title, subtitle: $subtitle, imageUrl: $imageUrl, isActive: $isActive)';
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is Banner && other.id == id;
  }

  @override
  int get hashCode => id.hashCode;
}
