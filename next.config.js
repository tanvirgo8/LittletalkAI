const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  typedRoutes: false,
  serverExternalPackages: ['node:sqlite'],
  webpack: (config, { isServer }) => {
    config.resolve.alias['@'] = path.resolve(__dirname);
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push('node:sqlite');
    } else {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        'node:fs': false,
        'node:path': false,
        'node:sqlite': false,
      };
    }
    return config;
  },
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-XSS-Protection', value: '1; mode=block' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob:",
              "connect-src 'self' https://*.firebaseio.com https://*.googleapis.com wss://*.firebaseio.com",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
