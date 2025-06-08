import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['gytx.dev'],
  },
  async rewrites() {
    return [
      {
        source: '/api/proxy/:path*',
        destination: 'https://gytx.dev/discretion241/uploads/profiles/:path*',
      },
    ];
  },
};

export default nextConfig;
