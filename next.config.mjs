/** @type {import('next').NextConfig} */

const supabaseHost = (
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.NEXT_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  ""
)
  .trim()
  .replace(/^https?:\/\//, "")
  .replace(/\/.*$/, "");

const supabaseImg = supabaseHost
  ? `https://${supabaseHost}`
  : "https://*.supabase.co";
const supabaseConnect = supabaseHost
  ? `https://${supabaseHost} wss://${supabaseHost}`
  : "https://*.supabase.co wss://*.supabase.co";

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://maps.googleapis.com https://maps.gstatic.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              `img-src 'self' data: blob: https://*.supabase.co ${supabaseImg} https://maps.gstatic.com https://maps.googleapis.com https://*.googleapis.com`,
              "font-src 'self' https://fonts.gstatic.com data:",
              `connect-src 'self' https://*.supabase.co wss://*.supabase.co ${supabaseConnect} https://maps.googleapis.com https://places.googleapis.com https://api.resend.com`,
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
      {
        source: "/admin",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/admin/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};
export default nextConfig;
