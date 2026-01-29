# MaanEdu - Educational Flutter App

A complete Flutter educational app with Supabase backend integration featuring authentication, course management, video streaming, and user profiles.

## 🚀 Features

### ✅ **Authentication & User Management**
- Email/Password login and signup with Supabase Auth
- User profile management with editable information
- Secure logout functionality
- Persistent authentication state

### ✅ **Course Management**
- Dashboard with course grid layout
- Course detail screens with class listings
- Beautiful Material 3 design with Google Fonts
- Shimmer loading effects and error handling

### ✅ **Video Player**
- Support for YouTube, Vimeo, and direct video URLs
- Full-screen video playback
- Class descriptions and additional information
- Video controls and progress tracking

### ✅ **Modern UI/UX**
- Material 3 design system
- Google Fonts (Poppins) throughout
- Smooth animations and transitions
- Responsive design for different screen sizes
- Dark theme support

### ✅ **State Management**
- Provider pattern for clean state management
- Separate providers for Auth and Course data
- Real-time updates and error handling

## 🏗️ Architecture

```
lib/
├── models/          # Data models (Course, Class, User)
├── services/        # Supabase service layer
├── providers/       # State management (Provider pattern)
├── screens/         # UI screens
├── widgets/         # Reusable UI components
├── utils/           # Utilities and constants
└── main.dart        # App entry point
```

## 🛠️ Setup Instructions

### 1. Prerequisites
- Flutter SDK (3.8.1+)
- Dart SDK
- Android Studio / VS Code
- Supabase account

### 2. Supabase Database Setup

#### Create the following tables in your Supabase dashboard:

**Courses Table:**
```sql
CREATE TABLE courses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    thumbnail TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Classes Table:**
```sql
CREATE TABLE classes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    video_url TEXT NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Insert Sample Data:

**Sample Courses:**
```sql
INSERT INTO courses (title, description, thumbnail) VALUES 
('Flutter Development', 'Learn Flutter from basics to advanced concepts', 'https://picsum.photos/400/300?random=1'),
('React Native Basics', 'Master mobile development with React Native', 'https://picsum.photos/400/300?random=2'),
('Node.js Backend', 'Build scalable backend applications', 'https://picsum.photos/400/300?random=3'),
('Python for Data Science', 'Data analysis and machine learning with Python', 'https://picsum.photos/400/300?random=4');
```

**Sample Classes:**
```sql
-- Get course IDs first, then insert classes
INSERT INTO classes (course_id, title, video_url, description) VALUES 
('[COURSE_ID_1]', 'Introduction to Flutter', 'https://www.youtube.com/watch?v=1gDhl4leEzA', 'Learn the basics of Flutter framework'),
('[COURSE_ID_1]', 'Flutter Widgets', 'https://www.youtube.com/watch?v=AqCMFXEmf3w', 'Understanding Flutter widgets and layouts'),
('[COURSE_ID_1]', 'State Management', 'https://www.youtube.com/watch?v=d_m5csmrf7I', 'Managing app state effectively');
```

### 3. Project Configuration

#### Update Supabase credentials in `lib/utils/constants.dart`:
```dart
static const String supabaseUrl = 'YOUR_SUPABASE_PROJECT_URL';
static const String supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY';
```

### 4. Installation

1. **Clone and setup:**
```bash
git clone <your-repo>
cd maanedu
```

2. **Install dependencies:**
```bash
flutter pub get
```

3. **Run the app:**
```bash
flutter run
```

## 📱 App Flow

1. **Splash Screen** → Checks authentication status
2. **Login/Signup** → Supabase authentication
3. **Dashboard** → Shows available courses in grid
4. **Course Detail** → Lists all classes for selected course
5. **Video Player** → Plays class videos with description
6. **Profile** → User info management and logout

## 🔧 Dependencies

```yaml
dependencies:
  flutter: sdk
  
  # UI & Design
  google_fonts: ^6.2.1
  
  # Backend & Authentication
  supabase_flutter: ^2.3.4
  
  # State Management
  provider: ^6.1.1
  
  # Video Player
  youtube_player_flutter: ^9.0.3
  chewie: ^1.8.1
  video_player: ^2.8.2
  
  # Navigation & Utils
  go_router: ^13.2.0
  shared_preferences: ^2.2.2
  
  # UI Components
  cached_network_image: ^3.3.1
  shimmer: ^3.0.0
```

## 🎯 Key Features Implementation

### Authentication Flow
- Supabase Auth with email/password
- Real-time auth state listening
- Automatic navigation based on auth status

### Video Player
- Supports YouTube, Vimeo, and direct video URLs
- Automatic video type detection
- Full-screen playback support

### Course Management
- Grid layout with course cards
- Shimmer loading effects
- Error handling and retry functionality

### State Management
- Provider pattern for clean architecture
- Separate providers for different data domains
- Loading states and error handling

## 🚦 Getting Started

1. Set up Supabase project with the provided schema
2. Update constants with your Supabase credentials
3. Run `flutter pub get` to install dependencies
4. Launch the app with `flutter run`
5. Create an account or sign in to test the features

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🤝 Contributing

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📞 Support

For support and questions, please contact [your-email@example.com]

---

**Happy Learning! 🎓**