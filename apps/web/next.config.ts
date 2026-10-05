import path from "node:path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A self-contained server for the production image; the root covers the workspace packages.
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../../"),
  // Dev only: let devices on the home network (opened by LAN IP) load Next dev resources.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*"],
};

export default nextConfig;
