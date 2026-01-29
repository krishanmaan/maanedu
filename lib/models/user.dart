class AppUser {
  final String id;
  final String email;
  final String? name;
  final String? avatar;
  final DateTime createdAt;

  AppUser({
    required this.id,
    required this.email,
    this.name,
    this.avatar,
    required this.createdAt,
  });

  factory AppUser.fromJson(Map<String, dynamic> json) {
    return AppUser(
      id: json['id'] as String,
      email: json['email'] as String,
      name: json['name'] as String?,
      avatar: json['avatar'] as String?,
      createdAt: DateTime.parse(json['created_at'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'name': name,
      'avatar': avatar,
      'created_at': createdAt.toIso8601String(),
    };
  }

  @override
  String toString() {
    return 'AppUser(id: $id, email: $email, name: $name)';
  }
}
