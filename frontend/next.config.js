/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.talentos.ai" },
      { protocol: "http", hostname: "localhost" },
    ],
  },

  // Proxy /api/* and /uploads/* to the backend so the browser never makes
  // a cross-origin request — eliminates all CORS preflight issues.
  async rewrites() {
    const backendUrl = process.env.BACKEND_URL || "http://backend:8000";
    return [
      {
        source: "/api/:path*",
        destination: `${backendUrl}/api/:path*`,
      },
      {
        source: "/uploads/:path*",
        destination: `${backendUrl}/uploads/:path*`,
      },
    ];
  },
};

module.exports = nextConfig;
