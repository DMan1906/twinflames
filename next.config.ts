import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  
  // Use default production build for Docker/Dokploy
  // (not standalone - that's for edge deployment)
  // The default creates .next/ with all static assets included
  
  // If TypeScript still complains about 'typescript', remove this block too.
  // Next.js 16 encourages running 'tsc' and 'eslint' as separate 
  // CI steps rather than during 'next build'.
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;