class Link {
  final String id;
  final String title;
  final String? description;
  final String url;
  final String? thumbnailUrl;
  final String? category;
  final DateTime createdAt;
  final DateTime updatedAt;
  final bool isActive;
  final int sortOrder;
  final String? createdBy;
  final Map<String, dynamic>? metadata;

  Link({
    required this.id,
    required this.title,
    this.description,
    required this.url,
    this.thumbnailUrl,
    this.category,
    required this.createdAt,
    required this.updatedAt,
    required this.isActive,
    required this.sortOrder,
    this.createdBy,
    this.metadata,
  });

  factory Link.fromJson(Map<String, dynamic> json) {
    return Link(
      id: json['id'] as String,
      title: json['title'] as String,
      description: json['description'] as String?,
      url: json['url'] as String,
      thumbnailUrl: json['thumbnail_url'] as String?,
      category: json['category'] as String?,
      createdAt: DateTime.parse(json['created_at'] as String),
      updatedAt: DateTime.parse(json['updated_at'] as String),
      isActive: json['is_active'] as bool? ?? true,
      sortOrder: json['sort_order'] as int? ?? 0,
      createdBy: json['created_by'] as String?,
      metadata: json['metadata'] as Map<String, dynamic>?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'description': description,
      'url': url,
      'thumbnail_url': thumbnailUrl,
      'category': category,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
      'is_active': isActive,
      'sort_order': sortOrder,
      'created_by': createdBy,
      'metadata': metadata,
    };
  }

  Link copyWith({
    String? id,
    String? title,
    String? description,
    String? url,
    String? thumbnailUrl,
    String? category,
    DateTime? createdAt,
    DateTime? updatedAt,
    bool? isActive,
    int? sortOrder,
    String? createdBy,
    Map<String, dynamic>? metadata,
  }) {
    return Link(
      id: id ?? this.id,
      title: title ?? this.title,
      description: description ?? this.description,
      url: url ?? this.url,
      thumbnailUrl: thumbnailUrl ?? this.thumbnailUrl,
      category: category ?? this.category,
      createdAt: createdAt ?? this.createdAt,
      updatedAt: updatedAt ?? this.updatedAt,
      isActive: isActive ?? this.isActive,
      sortOrder: sortOrder ?? this.sortOrder,
      createdBy: createdBy ?? this.createdBy,
      metadata: metadata ?? this.metadata,
    );
  }

  @override
  String toString() {
    return 'Link(id: $id, title: $title, url: $url, category: $category)';
  }

  @override
  bool operator ==(Object other) {
    if (identical(this, other)) return true;
    return other is Link && other.id == id;
  }

  @override
  int get hashCode => id.hashCode;
}
