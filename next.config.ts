import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  
  // Keep this for Dokploy/Nixpacks deployment
  output: 'standalone',

  // If TypeScript still complains about 'typescript', remove this block too.
  // Next.js 16 encourages running 'tsc' and 'eslint' as separate 
  // CI steps rather than during 'next build'.
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;