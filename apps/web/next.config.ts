import path from "node:path";
import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  // A self-contained server for the production image; the root covers the workspace packages.
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../../"),
  // Dev only: let devices on the home network (opened by LAN IP) load Next dev resources.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*"],
};

export default withSentryConfig(nextConfig, {
  // Source maps go up to this project when SENTRY_AUTH_TOKEN is set, i.e. in the deploy build.
  org: "dice-table",
  project: "dice-app-web",
  // Ad blockers drop requests to sentry.io; through this route errors arrive from our own domain.
  tunnelRoute: "/monitoring",
  // Navigation tracking is part of tracing, which is off.
  suppressOnRouterTransitionStartWarning: true,
});
