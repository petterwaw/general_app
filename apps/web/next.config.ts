import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Dev only: let devices on the home network (opened by LAN IP) load Next dev resources.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*"],
};

export default nextConfig;
