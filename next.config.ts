import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dev-mode indicator defaults to bottom-left, which is exactly where
  // the mobile Reader's own "이전 페이지" button sits — every corner has a
  // reader control on mobile (toolbar top, prev/next bottom), so there's
  // no non-overlapping position to move it to instead. Dev-only; never
  // ships to users.
  devIndicators: false,
  images: {
    // Supabase Storage public URLs (book covers, DOCX-embedded images).
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
