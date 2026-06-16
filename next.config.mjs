/** @type {import('next').NextConfig} */
const backendUrl =
  process.env.BACKEND_URL || "http://72.62.8.85:3001";

const nextConfig = {
  /* config options here */
  reactCompiler: true,
  async rewrites() {
    return [
      {
        source: "/api-backend/:path*",
        destination: `${backendUrl}/:path*`,
      },
      {
        source: "/r/:path*",
        destination: `${backendUrl}/r/:path*`,
      },
      {
        source: "/links/:path*/whatsapp",
        destination: `${backendUrl}/links/:path*/whatsapp`,
      },
    ];
  },
};

export default nextConfig;
