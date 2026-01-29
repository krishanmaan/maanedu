class VideoUtils {
  static String? extractYouTubeVideoId(String url) {
    final RegExp regExp = RegExp(
      r'^.*((youtu.be\/)|(v\/)|(\/u\/\w\/)|(embed\/)|(watch\?))\??v?=?([^#\&\?]*).*',
      caseSensitive: false,
      multiLine: false,
    );
    
    final match = regExp.firstMatch(url);
    if (match != null && match.group(7) != null && match.group(7)!.length == 11) {
      return match.group(7);
    }
    return null;
  }

  static bool isYouTubeUrl(String url) {
    return url.contains('youtube.com') || url.contains('youtu.be');
  }

  static bool isVimeoUrl(String url) {
    return url.contains('vimeo.com');
  }

  static String? extractVimeoVideoId(String url) {
    final RegExp regExp = RegExp(
      r'^.*vimeo\.com\/(.*\/)?(.*)',
      caseSensitive: false,
      multiLine: false,
    );
    
    final match = regExp.firstMatch(url);
    if (match != null && match.group(2) != null) {
      return match.group(2);
    }
    return null;
  }

  static bool isBase64Video(String url) {
    return url.startsWith('data:video/');
  }

  static bool isMuxVideo(String url) {
    return url.startsWith('mux://');
  }

  static String? extractMuxPlaybackId(String url) {
    if (isMuxVideo(url)) {
      final playbackId = url.replaceFirst('mux://', '').trim();
      
      // Validate playback ID format (should be alphanumeric, typically 11-12 characters)
      if (playbackId.isNotEmpty && RegExp(r'^[a-zA-Z0-9]+$').hasMatch(playbackId)) {
        return playbackId;
      }
    }
    return null;
  }

  static String getMuxStreamUrl(String playbackId) {
    // Validate playback ID before creating URL
    if (playbackId.isEmpty) {
      throw ArgumentError('Playback ID cannot be empty');
    }
    
    // Mux uses adaptive streaming, so we return the master playlist
    // The player will automatically select the appropriate quality
    return 'https://stream.mux.com/$playbackId.m3u8';
  }

  
  static String getMuxPlaybackUrl(String playbackId) {
    // Alternative URL format for testing
    return 'https://stream.mux.com/$playbackId';
  }

  static String getMuxThumbnailUrl(String playbackId, {int? width, int? height}) {
    String url = 'https://image.mux.com/$playbackId/thumbnail.jpg';
    List<String> params = [];
    
    if (width != null) params.add('width=$width');
    if (height != null) params.add('height=$height');
    
    if (params.isNotEmpty) {
      url += '?${params.join('&')}';
    }
    
    return url;
  }

  static VideoType getVideoType(String url) {
    if (isBase64Video(url)) {
      return VideoType.base64;
    } else if (isMuxVideo(url)) {
      return VideoType.mux;
    } else if (isYouTubeUrl(url)) {
      return VideoType.youtube;
    } else if (isVimeoUrl(url)) {
      return VideoType.vimeo;
    } else {
      return VideoType.direct;
    }
  }
}

enum VideoType {
  youtube,
  vimeo,
  direct,
  base64,
  mux,
}
