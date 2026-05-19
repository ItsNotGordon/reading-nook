import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "placehold.co",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.gr-assets.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "i.gr-assets.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "s.gr-assets.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "covers.openlibrary.org",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
