import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async redirects() {
    return [
      {
        source: "/admin/call-sheets",
        destination: "/admin/dispatch",
        permanent: false,
      },
      {
        source: "/admin/assets",
        destination: "/admin/inventory",
        permanent: false,
      },
      {
        source: "/admin/crm",
        destination: "/admin/contacts",
        permanent: false,
      },
      {
        source: "/admin/moderation",
        destination: "/admin/comments",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
