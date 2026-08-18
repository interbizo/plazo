const isProduction = process.env.NODE_ENV === 'production';

/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: [
    'localhost',
    '127.0.0.1',
  ],
  typescript: {
    ignoreBuildErrors: true,
  },
  ...(isProduction
    ? {
        experimental: {
          optimizePackageImports: [
            'lucide-react',
            'react-hot-toast',
            'date-fns',
            'zustand',
          ],
        },
      }
    : {}),
  compiler: {
    removeConsole: isProduction ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  productionBrowserSourceMaps: false,
  
  // Enable gzip/brotli compression
  compress: true,

  // Performance: Power headers for SEO & caching
  async headers() {
    if (!isProduction) {
      return [
        {
          source: '/:path*',
          headers: [
            { key: 'Cache-Control', value: 'no-store, max-age=0' },
            { key: 'X-Content-Type-Options', value: 'nosniff' },
            { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
            { key: 'X-XSS-Protection', value: '1; mode=block' },
            { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
            { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          ],
        },
      ];
    }

    return [
      {
        // Static assets — aggressive caching (1 year)
        source: '/:path*.(ico|png|jpg|jpeg|gif|webp|svg|woff|woff2|ttf|eot)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        // JS/CSS bundles — long cache with revalidation
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        // HTML pages — short cache, revalidate
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      {
        // Product/service pages — cache for crawlers, revalidate for users
        source: '/products/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400' },
        ],
      },
      {
        source: '/services/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400' },
        ],
      },
      {
        source: '/jobs/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, s-maxage=1800, stale-while-revalidate=86400' },
        ],
      },
      {
        source: '/articles/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400' },
        ],
      },
    ];
  },

  webpack: (config, { isServer }) => {
    if (!isProduction) {
      return config;
    }

    config.optimization = {
      ...config.optimization,
      moduleIds: 'deterministic',
      runtimeChunk: isServer ? undefined : 'single',
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          vendor: {
            name: 'vendor',
            chunks: 'all',
            test: /node_modules/,
            priority: 20,
          },
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: 10,
            reuseExistingChunk: true,
            enforce: true,
          },
        },
      },
    };
    
    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "3001",
        pathname: "/uploads/**",
      },
      {
        protocol: "http",
        hostname: "localhost",
        port: "3001",
        pathname: "/api/admin/kyc/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "3001",
        pathname: "/uploads/**",
      },
      {
        protocol: "http",
        hostname: "127.0.0.1",
        port: "3001",
        pathname: "/api/admin/kyc/**",
      },
      {
        protocol: "https",
        hostname: "api.ehftest.dev",
        pathname: "/uploads/**",
      },
      {
        protocol: "https",
        hostname: "api.ehftest.dev",
        pathname: "/api/admin/kyc/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "api.plazo.id",
        pathname: "/uploads/**",
      },
      {
        protocol: "https",
        hostname: "api.plazo.id",
        pathname: "/api/admin/kyc/**",
      },
      {
        protocol: "https",
        hostname: "*.plazo.id",
      },
      {
        protocol: "https",
        hostname: "*.ehftest.dev",
      },
      {
        protocol: "https",
        hostname: "*.plazo.com",
      },
    ].concat(
      process.env.NEXT_PUBLIC_S3_PUBLIC_URL
        ? (() => {
            try {
              const s3Host = new URL(process.env.NEXT_PUBLIC_S3_PUBLIC_URL).hostname;
              return [
                {
                  protocol: "https",
                  hostname: s3Host,
                },
                {
                  protocol: "http",
                  hostname: s3Host,
                },
              ];
            } catch {
              return [];
            }
          })()
        : [],
    ),
    unoptimized: process.env.NODE_ENV === 'development',
    // Optimize images served by Next.js
    formats: ['image/avif', 'image/webp'],
    minimumCacheTTL: 2592000, // 30 days cache for optimized images
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

module.exports = nextConfig;
