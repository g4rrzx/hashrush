import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/.well-known/farcaster.json',
        destination: 'https://api.farcaster.xyz/miniapps/hosted-manifest/019bcc10-2684-ead0-c84e-3baa0e543a03',
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
