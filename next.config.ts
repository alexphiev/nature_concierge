import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  async redirects() {
    return [
      { source: "/places", destination: "/lieux", permanent: true },
      { source: "/places/:path*", destination: "/lieux/:path*", permanent: true },
    ];
  },
};

export default nextConfig;
