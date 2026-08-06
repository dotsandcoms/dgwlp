/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      // Allow Supabase Storage public images once you set your project ref:
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
};
export default nextConfig;
