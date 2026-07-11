/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    proxyClientMaxBodySize: "50mb",
  },
  async redirects() {
    return [
      {
        source: "/dashboard/log-import",
        destination: "/import-check/log-import",
        permanent: true,
      },
      {
        source: "/dashboard/hos-list",
        destination: "/import-check/hos-list",
        permanent: true,
      },
      {
        source: "/dashboard/person-target",
        destination: "/standard/person-typearea",
        permanent: true,
      },
      {
        source: "/dashbord/hos-list",
        destination: "/import-check/hos-list",
        permanent: true,
      },
      {
        source: "/dasboard/hos-list",
        destination: "/import-check/hos-list",
        permanent: true,
      },
      {
        source: "/dashbord/quality",
        destination: "/dashboard/quality",
        permanent: true,
      },
      {
        source: "/dasboard/quality",
        destination: "/dashboard/quality",
        permanent: true,
      },
      {
        source: "/dashboard",
        destination: "/import-check/hos-list",
        permanent: true,
      },
      {
        source: "/dashbord",
        destination: "/import-check/hos-list",
        permanent: true,
      },
      {
        source: "/dasboard",
        destination: "/import-check/hos-list",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
