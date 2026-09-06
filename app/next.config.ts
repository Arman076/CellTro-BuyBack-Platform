import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "4000",
        pathname: "/uploads/**",
      },
      {
        protocol: "https",
        hostname: "localhost",
        port: "4000",
        pathname: "/uploads/**",
      },

      // Amazon legacy catalogue images
      {
        protocol: "https",
        hostname: "m.media-amazon.com",
        pathname: "/**",
      },

      // Google legacy catalogue images
      {
        protocol: "https",
        hostname: "encrypted-tbn0.gstatic.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;