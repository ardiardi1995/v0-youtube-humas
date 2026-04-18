/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  headers: async () => {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "frame-src 'self' https://www.youtube-nocookie.com https://www.youtube.com; script-src 'self' 'unsafe-inline' https://www.youtube.com; connect-src 'self' https://www.youtube.com https://www.googleapis.com",
          },
          {
            key: "X-Frame-Options",
            value: "ALLOWALL",
          },
        ],
      },
    ]
  },
}

export default nextConfig
