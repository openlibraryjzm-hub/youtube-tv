/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',  // ← THIS is the magic line: static export to out/
  trailingSlash: true,
  images: { unoptimized: true },  // Fixes any Next Image embeds for static
  // Exclude API routes from static export - they're only used in dev mode
  // Tauri uses IPC commands directly, not API routes
};

module.exports = nextConfig;
