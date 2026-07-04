/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // standalone only for Docker/self-host; on Vercel it breaks routing (leave default).
  output: process.env.VERCEL ? undefined : 'standalone',
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'images.unsplash.com' },
      { protocol: 'https', hostname: 'images.pexels.com' },
      { protocol: 'http', hostname: 'localhost' },
      { protocol: 'https', hostname: '**' },
    ],
  },
};

module.exports = nextConfig;
