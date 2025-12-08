/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // Required for Electron
  // Disable image optimization in Electron (not needed)
  images: {
    unoptimized: true
  },
  // Ensure static files are properly handled in standalone mode
  distDir: '.next',
  // Enable compression
  compress: true,
  // Disable source maps in production (saves space)
  productionBrowserSourceMaps: false,
  // Exclude unnecessary files from output tracing
  experimental: {
    outputFileTracingExcludes: {
      '*': [
        'node_modules/@swc/core*/**',
        'node_modules/@next/swc*/**/target/**',
        'node_modules/**/test/**',
        'node_modules/**/tests/**',
        'node_modules/**/__tests__/**',
        'node_modules/**/docs/**',
        'node_modules/**/examples/**',
        'node_modules/**/.github/**',
        'node_modules/**/.vscode/**',
        'node_modules/**/coverage/**',
        'node_modules/**/benchmark/**',
        'node_modules/**/demo/**',
      ],
    },
  },
};

export default nextConfig;
