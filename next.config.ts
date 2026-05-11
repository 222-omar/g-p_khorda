import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  trailingSlash: true,
  typescript: {
    ignoreBuildErrors: true,
  },
  // @ts-ignore
  eslint: {
    ignoreDuringBuilds: true,
  },
  async rewrites() {
    return [
      {
        source: '/api/:path*/',
        destination:
          process.env.NODE_ENV === 'development'
            ? 'http://127.0.0.1:8000/api/:path*/'
            : 'https://four-sale-backend.onrender.com/api/:path*/',
      },
      {
        source: '/api/:path*',
        destination:
          process.env.NODE_ENV === 'development'
            ? 'http://127.0.0.1:8000/api/:path*'
            : 'https://four-sale-backend.onrender.com/api/:path*',
      },
      {
        source: '/media/:path*/',
        destination:
          process.env.NODE_ENV === 'development'
            ? 'http://127.0.0.1:8000/media/:path*/'
            : 'https://four-sale-backend.onrender.com/media/:path*/',
      },
      {
        source: '/media/:path*',
        destination:
          process.env.NODE_ENV === 'development'
            ? 'http://127.0.0.1:8000/media/:path*'
            : 'https://four-sale-backend.onrender.com/media/:path*',
      },
    ];
  },
};

export default nextConfig;
