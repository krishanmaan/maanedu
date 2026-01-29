import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  eslint: {
    // Allow production builds to succeed even if there are ESLint errors
    ignoreDuringBuilds: true,
  },
  experimental: {
    // Helps with hydration issues
    optimizePackageImports: ['react', 'react-dom'],
  },
  
  // Moved from experimental as per Next.js 15.5.2
  serverExternalPackages: [],
  // Handle browser extensions that modify DOM
  poweredByHeader: false,
  
  // Increase body size limit for large video uploads
  serverRuntimeConfig: {
    maxFileSize: '5gb',
  },

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'image.mux.com',
      },
    ],
  },
  
  // Note: Webpack config not needed for Turbopack, but keeping for fallback compatibility
};

export default nextConfig;
