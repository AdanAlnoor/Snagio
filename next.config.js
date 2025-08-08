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
    // Enable image optimization with modern formats
    formats: ['image/avif', 'image/webp'],
    // Optimized device sizes for responsive images
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    // Optimized image sizes for srcset
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    // Increase cache time for better performance
    minimumCacheTTL: 3600, // 1 hour
    // Disable static imports for SVGs to prevent bloat
    dangerouslyAllowSVG: false,
    // Add security policy for SVGs
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    // Enable blur placeholders for better UX
    unoptimized: false,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
    // Enable optimized package imports
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
  // Enable compression
  compress: true,
  // Enable strict mode for better React development
  reactStrictMode: true,
  // Disable production source maps for smaller builds
  productionBrowserSourceMaps: false,
  // Optimize page loading
  poweredByHeader: false,
}

// Only apply webpack optimizations for production builds (not with Turbopack)
// Turbopack is used in development, Webpack is used in production
if (process.env.NODE_ENV === 'production') {
  nextConfig.webpack = (config, { isServer }) => {
    // Optimize for production
    if (!isServer) {
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          // Vendor chunk
          vendor: {
            name: 'vendor',
            chunks: 'all',
            test: /node_modules/,
            priority: 20,
          },
          // Common chunk
          common: {
            name: 'common',
            chunks: 'all',
            minChunks: 2,
            priority: 10,
            reuseExistingChunk: true,
            enforce: true,
          },
        },
      }
    }
    return config
  }
}

module.exports = nextConfig
