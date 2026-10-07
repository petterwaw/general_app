import type { MetadataRoute } from "next";

// "/" redirects here, and a sitemap lists only pages that do not redirect.
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: "https://dice-table.com/games" }];
}
