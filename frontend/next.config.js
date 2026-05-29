/** @type {import('next').NextConfig} */
const nextConfig = {
  // Force empty API URL so axios uses relative paths → Next.js rewrite proxy.
  // This overrides any NEXT_PUBLIC_API_URL from .env or docker-compose at BUILD TIME.
  env: {
    NEXT_PUBLIC_API_URL: "",
    NEXT_PUBLIC_WS_URL: "",
  },
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
