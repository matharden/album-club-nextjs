import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Album covers referenced by `cover_external` live on arbitrary hosts
  // (Wikipedia, label sites). next/image needs them allow-listed to optimise
  // them; anything not matched here would 400 at request time.
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
};

export default nextConfig;
