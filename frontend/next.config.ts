import path from 'path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  allowedDevOrigins: ['10.*.*.*', '172.*.*.*', '192.168.*.*'],
  experimental: {
    externalDir: true,
  },
  turbopack: {
    root: path.resolve(__dirname, '..'),  // points to /app
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'api.dicebear.com',
      },
    ],
  },
};

export default nextConfig;
