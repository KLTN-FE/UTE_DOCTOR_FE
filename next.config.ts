import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
      },
    ],
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  typescript: {
    ignoreBuildErrors: true,
  },

  // Socket.IO polling hits `/socket.io/?EIO=4&transport=polling` (trailing slash).
  // Next's default trailing-slash redirect 308s it to `/socket.io?...`, which no longer
  // matches the `/socket.io/:path*` Vercel rewrite -> redirect storm + unstable socket.
  // Skipping the redirect lets the request proxy straight through the rewrite.
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
