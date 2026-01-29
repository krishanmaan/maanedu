# Keep annotations used by Razorpay SDK
-keep class proguard.annotation.Keep { *; }
-keep class proguard.annotation.KeepClassMembers { *; }

# Keep Razorpay SDK classes and members
-keep class com.razorpay.** { *; }
-dontwarn com.razorpay.**

# Flutter and plugin generated classes
-keep class io.flutter.** { *; }
-dontwarn io.flutter.**

# Keep classes for common Flutter plugins used in this app
-keep class dev.fluttercommunity.** { *; }
-keep class io.github.ponnamkarthik.toast.fluttertoast.** { *; }
-keep class io.flutter.plugins.sharedpreferences.** { *; }
-keep class io.flutter.plugins.pathprovider.** { *; }
-keep class io.flutter.plugins.** { *; }
-keep class com.applinks.** { *; }
-keep class io.flutter.plugins.urllauncher.** { *; }
-keep class com.pichillilorenzo.flutter_inappwebview.** { *; }
-keep class io.flutter.plugins.imagepicker.** { *; }
-keep class com.google.android.exoplayer2.** { *; }
-keep class androidx.lifecycle.** { *; }

# Prevent stripping of Kotlin metadata used by plugins
-keep class kotlin.Metadata { *; }
-keepclassmembers class ** {
    @kotlin.Metadata *;
}

# Keep enums used via reflection
-keepclassmembers enum * { *; }

# Keep classes referenced from resources
-keepclassmembers class * {
    public <init>(...);
}

# Do not warn about javax annotations that may be missing at runtime
-dontwarn javax.annotation.**
