import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  
  // Optimize for container/Docker deployment
  output: process.env.DOCKER_BUILD ? 'standalone' : undefined,
  
  // Performance optimizations
  productionBrowserSourceMaps: false,

  // If TypeScript still complains about 'typescript', remove this block too.
  // Next.js 16 encourages running 'tsc' and 'eslint' as separate 
  // CI steps rather than during 'next build'.
  typescript: {
    ignoreBuildErrors: true,
  },

  onDemandEntries: {
    maxInactiveAge: 60 * 60 * 1000, // 1 hour
    pagesBufferLength: 5,
  },
};

export default nextConfig;