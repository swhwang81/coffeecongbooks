import type { Metadata } from "next";
import { pretendard } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  // Resolves relative OG/Twitter image URLs into absolute ones — required
  // for social-platform scrapers, which don't share the page's own origin.
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: {
    default: "Coffeecong Books",
    template: "%s | Coffeecong Books",
  },
  description: "문서를 책처럼, 누구나 쉽게. Turn documents into beautiful, responsive ebooks.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${pretendard.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
