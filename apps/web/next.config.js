/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@notes/shared"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "mega.nz",
      },
    ],
  },
};

module.exports = nextConfig;
