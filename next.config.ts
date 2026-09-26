import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  cacheLife: {
    corpus: {
      stale: 300,
      revalidate: 3600,
      expire: 2592000,
    },
  },
  images: {
    // Neon Object Storage public_read bucket (branch endpoint host varies).
    remotePatterns: [
      { protocol: "https", hostname: "**.aws.neon.tech", pathname: "/place-photos/**" },
    ],
  },
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
