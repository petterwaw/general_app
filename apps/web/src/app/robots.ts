import type { MetadataRoute } from "next";

// A game's ID or invite code is enough to watch or join it, so those pages stay out of search
// results. A request to crawlers, not protection.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/games/", "/join/"],
    },
    sitemap: "https://dice-table.com/sitemap.xml",
  };
}
