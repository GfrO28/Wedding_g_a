import type { NextConfig } from "next";

const r2Hostname = process.env.R2_PUBLIC_URL
  ? new URL(process.env.R2_PUBLIC_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Dominio público de R2 (ver R2_PUBLIC_URL en .env)
      { protocol: "https", hostname: "*.r2.dev" },
      ...(r2Hostname && !r2Hostname.endsWith(".r2.dev")
        ? [{ protocol: "https" as const, hostname: r2Hostname }]
        : []),
    ],
  },
};

export default nextConfig;
