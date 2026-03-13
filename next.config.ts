import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'export',
  serverExternalPackages: ['pdf-parse', 'mammoth'],
};

export default nextConfig;
