/** @type {import('next').NextConfig} */
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

const nextConfig = {
  output: 'standalone',
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  swcMinify: true, // Re-enable SWC minification for better performance
  
  // Image optimization
  images: {
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: 'upload.wikimedia.org',
      },
    ],
  },
  
  // Reduce logging verbosity
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
  
  // Reduce build output verbosity
  onDemandEntries: {
    // Period (in ms) where the server will keep pages in the buffer
    maxInactiveAge: 25 * 1000,
    // Number of pages that should be kept simultaneously without being disposed
    pagesBufferLength: 2,
  },
  
  // CRITICAL: Security Headers for Production
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'X-Frame-Options',
          value: 'DENY'
        },
        {
          key: 'X-Content-Type-Options',
          value: 'nosniff'
        },
        {
          key: 'X-XSS-Protection',
          value: '1; mode=block'
        },
        {
          key: 'Referrer-Policy',
          value: 'strict-origin-when-cross-origin'
        },
        {
          key: 'Permissions-Policy',
          value: 'camera=(), microphone=(), geolocation=()'
        },
        // HSTS - Only enable in production with HTTPS
        ...(process.env.NODE_ENV === 'production' ? [{
          key: 'Strict-Transport-Security',
          value: 'max-age=31536000; includeSubDomains; preload'
        }] : []),
        {
          key: 'Content-Security-Policy',
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com https://va.vercel-scripts.com https://js.stripe.com",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com",
            "img-src 'self' data: https: blob:",
            "connect-src 'self' https://*.supabase.co https://api.stripe.com https://checkout.stripe.com https://js.stripe.com https://cloudflareinsights.com https://x.com https://twitter.com",
            "frame-src 'self' https://checkout.stripe.com https://js.stripe.com",
            "media-src 'self'",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "frame-ancestors 'none'"
          ].join('; ')
        }
      ]
    }
  ],
  
  // Explicitly define environment variables
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    JWT_SECRET: process.env.JWT_SECRET,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    TWITTER_BEARER_TOKEN: process.env.TWITTER_BEARER_TOKEN,
    EXPRESS_SERVER_URL: process.env.EXPRESS_SERVER_URL || 'http://localhost:3001',
    SUPPRESS_SUPABASE_WARNINGS: process.env.NODE_ENV === 'development' ? 'true' : 'false',
  },
  
  // Enable experimental features
  experimental: {
    // Set this to true if you're having issues with environment variables
    esmExternals: true,
    // API configuration
    serverComponentsExternalPackages: ['@prisma/client', 'agent-twitter-client'],
  },

  // Webpack configuration for native modules
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    // Handle native modules that shouldn't be bundled
    if (isServer) {
      config.externals.push({
        'agent-twitter-client': 'commonjs agent-twitter-client',
      });
    }

    // Ignore native module warnings and Supabase realtime warnings
    config.ignoreWarnings = [
      { module: /node_modules\/agent-twitter-client/ },
      { module: /node_modules\/@supabase\/realtime-js/ },
      // Suppress critical dependency warnings for Supabase realtime
      (warning) => {
        return warning.message.includes('Critical dependency: the request of a dependency is an expression') &&
               warning.message.includes('@supabase/realtime-js');
      },
    ];

    return config;
  },

  // Configure API routes
  rewrites: async () => {
    return [
      {
        source: '/api/:path*',
        destination: '/api/:path*',
      }
    ];
  },
};

module.exports = withBundleAnalyzer(nextConfig);