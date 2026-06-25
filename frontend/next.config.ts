import path from 'path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  experimental: {
    externalDir: true,
  },
  turbopack: {
    root: path.resolve(__dirname, '..'),  // points to /app
  },
};

export default nextConfig;
