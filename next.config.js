/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
    // Enable image optimization
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  // Enable compression
  compress: true,
  // Enable strict mode for better React development
  reactStrictMode: true,
  // Optimize CSS
  // Enable production source maps for better debugging
  productionBrowserSourceMaps: false,
  // Optimize page loading
  poweredByHeader: false,
}

module.exports = nextConfig
