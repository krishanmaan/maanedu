import 'package:flutter/material.dart';

class AppColors {
  // Primary Colors (Vibrant Purple/Indigo)
  static const Color primary = Color(0xFF6D57FC);
  static const Color primaryLight = Color(0xFF9080FC);
  static const Color primaryDark = Color(0xFF4834D4);
  static const Color primaryContainer = Color(0xFFEFE9FF);

  // Secondary Colors (Teal/Cyan)
  static const Color secondary = Color(0xFF00D2D3);
  static const Color secondaryLight = Color(0xFF48F3F4);
  static const Color secondaryDark = Color(0xFF01A3A4);
  static const Color secondaryContainer = Color(0xFFE0F7FA);

  // Accent Colors (Warm Orange/Amber)
  static const Color accent = Color(0xFFFF9F43);
  static const Color accentLight = Color(0xFFFFC07F);
  static const Color accentDark = Color(0xFFE58E26);

  // Background Colors - Cleaner, cleaner whites
  static const Color background = Color(0xFFF8F9FD);
  static const Color surface = Color(0xFFFFFFFF);
  static const Color surfaceVariant = Color(0xFFF5F6FA);
  static const Color surfaceContainer = Color(0xFFEDEEF6);
  static const Color surfaceContainerHighest = Color(0xFFE1E2E9);

  // Text Colors
  static const Color onPrimary = Color(0xFFFFFFFF);
  static const Color onSecondary = Color(0xFFFFFFFF);
  static const Color onSurface = Color(0xFF2D3436); // Darker, softer black
  static const Color onSurfaceVariant = Color(0xFF636E72); // Slate grey
  static const Color onBackground = Color(0xFF2D3436);

  // Status Colors
  static const Color success = Color(0xFF00B894);
  static const Color successLight = Color(0xFF55EFC4);
  static const Color successDark = Color(0xFF00896F);
  static const Color successContainer = Color(0xFFE0F2F1);

  static const Color warning = Color(0xFFFDCA40);
  static const Color warningLight = Color(0xFFFFEAA7);
  static const Color warningDark = Color(0xFFFDCB6E); // Adjusted
  static const Color warningContainer = Color(0xFFFFF8E1);

  static const Color error = Color(0xFFFF7675);
  static const Color errorLight = Color(0xFFFF7675); // Same for now or lighter
  static const Color errorDark = Color(0xFFD63031);
  static const Color errorContainer = Color(0xFFFFEBEE);

  static const Color info = Color(0xFF74B9FF);
  static const Color infoLight = Color(0xFFA29BFE); // Light purple/blue
  static const Color infoDark = Color(0xFF0984E3);
  static const Color infoContainer = Color(0xFFE1F5FE);

  // Neutral Colors
  static const Color grey50 = Color(0xFFFAFAFA);
  static const Color grey100 = Color(0xFFF5F6FA);
  static const Color grey200 = Color(0xFFDFE6E9);
  static const Color grey300 = Color(0xFFB2BEC3);
  static const Color grey400 = Color(0xFF636E72);
  static const Color grey500 = Color(0xFF2D3436); // Reusing detailed greys
  static const Color grey600 = Color(0xFF2D3436);
  static const Color grey700 = Color(0xFF1E272E);
  static const Color grey800 = Color(0xFF1E272E);
  static const Color grey900 = Color(0xFF000000);

  // Shadow Colors
  static const Color shadowLight = Color(0x0D000000); // More subtle
  static const Color shadowMedium = Color(0x1A000000);
  static const Color shadowDark = Color(0x33000000);

  // Overlay Colors
  static const Color overlay = Color(0x80000000);
  static const Color overlayLight = Color(0x40000000);
  static const Color overlayDark = Color(0xA0000000);

  // Gradient Lists
  static const List<Color> primaryGradient = [
    Color(0xFF6D57FC),
    Color(0xFF8E7CFC),
  ];
  static const List<Color> secondaryGradient = [
    Color(0xFF00D2D3),
    Color(0xFF55EFC4),
  ];
  static const List<Color> successGradient = [
    Color(0xFF00B894),
    Color(0xFF55EFC4),
  ];
  static const List<Color> warningGradient = [
    Color(0xFFFDCB6E),
    Color(0xFFFFEAA7),
  ];
  static const List<Color> errorGradient = [
    Color(0xFFD63031),
    Color(0xFFFF7675),
  ];
  static const List<Color> infoGradient = [
    Color(0xFF0984E3),
    Color(0xFF74B9FF),
  ];
  static const List<Color> purpleGradient = [
    Color(0xFFA29BFE),
    Color(0xFF6C5CE7),
  ];

  // Course Category Colors
  static const Color programming = Color(0xFF0984E3);
  static const Color design = Color(0xFF6C5CE7);
  static const Color business = Color(0xFF00B894);
  static const Color marketing = Color(0xFFFF7675);
  static const Color photography = Color(0xFFE17055);
  static const Color music = Color(0xFFE84393);
  static const Color fitness = Color(0xFFFDCB6E);
  static const Color cooking = Color(0xFF00CEC9);

  // Education Level Colors
  static const Color beginner = Color(0xFF00B894);
  static const Color intermediate = Color(0xFF0984E3);
  static const Color advanced = Color(0xFF6C5CE7);
  static const Color expert = Color(0xFFD63031);
}
