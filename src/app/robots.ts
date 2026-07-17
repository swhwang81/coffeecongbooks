import type { MetadataRoute } from "next";

// `/share/*` is deliberately NOT disallowed here — unlisted books opt out
// of indexing via the per-page `robots: noindex` meta tag instead (spec
// §6/§16). A robots.txt disallow would stop crawlers from ever fetching
// the page at all, which means they'd never see that noindex tag; an
// externally-linked unlisted URL could then still surface as a bare,
// content-less "disallowed" search result instead of being cleanly
// excluded. `/admin` and `/api` have no public value either way, so those
// are blocked outright.
export default function robots(): MetadataRoute.Robots {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api"] }],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
