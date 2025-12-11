/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',  // ← THIS is the magic line: static export to out/
  trailingSlash: true,
  images: { unoptimized: true },  // Fixes any Next Image embeds for static
  // Add any other config you already have here
};

module.exports = nextConfig;
