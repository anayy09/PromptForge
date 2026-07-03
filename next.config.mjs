/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // The model API key must never reach the client bundle. Route handlers read
  // it from the server environment only; do not add it to env exposure here.
  // Keep server-only packages out of the client graph (Next 15: top-level key).
  serverExternalPackages: ["openai"],
};

export default nextConfig;
