/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // Required for Electron
  // Disable image optimization in Electron (not needed)
  images: {
    unoptimized: true
  },
  // Ensure static files are properly handled in standalone mode
  distDir: '.next'
};

export default nextConfig;
