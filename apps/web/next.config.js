/** @type {import('next').NextConfig} */
const apiProxy = process.env.API_PROXY_URL || 'http://127.0.0.1:4000';

const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  transpilePackages: ['@pdrforge/shared'],
  poweredByHeader: false,
  async rewrites() {
    return [
      { source: '/api/v1/:path*', destination: `${apiProxy}/api/v1/:path*` },
      { source: '/uploads/:path*', destination: `${apiProxy}/uploads/:path*` },
    ];
  },
};

module.exports = nextConfig;
