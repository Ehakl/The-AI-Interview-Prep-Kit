import type { NextConfig } from "next";
import "./src/env";

const nextConfig: NextConfig = {
  async rewrites() {
    // If running on Vercel/Production without the env var, fallback to the deployed Render backend
    // instead of localhost to prevent DNS_HOSTNAME_RESOLVED_PRIVATE errors.
    const isProd = process.env.NODE_ENV === "production";
    const defaultBackend = isProd 
      ? "https://the-ai-interview-prep-kit-teow.onrender.com/api" 
      : "http://localhost:4000/api";

    return [
      {
        source: "/api/:path*",
        destination: `${process.env.BACKEND_API_URL || defaultBackend}/:path*`,
      },
    ];
  },
};

export default nextConfig;
