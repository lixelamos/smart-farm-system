import type { NextConfig } from "next";
const config: NextConfig = {
  poweredByHeader: false,
  async redirects() {
    return [
      { source: "/index.php", destination: "/", permanent: false },
      { source: "/login.php", destination: "/login", permanent: false },
      { source: "/signup.php", destination: "/register", permanent: false },
      {
        source: "/admin/index.php",
        destination: "/login?role=admin",
        permanent: false,
      },
      {
        source: "/manager/index.php",
        destination: "/login?role=manager",
        permanent: false,
      },
      ...[
        "farmer.php",
        "agronomist.php",
        "admin/portal.php",
        "manager/portal.php",
      ].map((path) => ({
        source: `/${path}`,
        destination: "/workspace",
        permanent: false,
      })),
      {
        source: "/chat.php",
        destination: "/workspace/messages",
        permanent: false,
      },
      {
        source: "/manager/reset-password.php",
        destination: "/reset-password",
        permanent: false,
      },
      ...["logout.php", "admin/logout.php", "manager/logout.php"].map(
        (path) => ({
          source: `/${path}`,
          destination: "/logout",
          permanent: false,
        }),
      ),
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ];
  },
};
export default config;
