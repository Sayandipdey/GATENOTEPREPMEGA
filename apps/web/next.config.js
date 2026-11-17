/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@notes/shared"],
  images: {
    domains: ["mega.nz"],
  },
};

module.exports = nextConfig;
