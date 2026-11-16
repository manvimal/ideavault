/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.IDEAVAULT_API_URL || "http://localhost:8085"}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
