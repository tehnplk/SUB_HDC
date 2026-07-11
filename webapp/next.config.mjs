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
        destination: "/import-check/files-count",
        permanent: true,
      },
      {
        source: "/import-check/hos-list",
        destination: "/import-check/files-count",
        permanent: true,
      },
      {
        source: "/dashboard/person-target",
        destination: "/standard/person-typearea",
        permanent: true,
      },
      {
        source: "/standard/dm-ht-count",
        destination: "/target-group/kpi/dm-ht-count",
        permanent: true,
      },
      {
        source: "/dashbord/hos-list",
        destination: "/import-check/files-count",
        permanent: true,
      },
      {
        source: "/dasboard/hos-list",
        destination: "/import-check/files-count",
        permanent: true,
      },
      {
        source: "/dashboard/quality",
        destination: "/quality",
        permanent: true,
      },
      {
        source: "/dashbord/quality",
        destination: "/quality",
        permanent: true,
      },
      {
        source: "/dasboard/quality",
        destination: "/quality",
        permanent: true,
      },
      {
        source: "/dashboard",
        destination: "/import-check/files-count",
        permanent: true,
      },
      {
        source: "/dashbord",
        destination: "/import-check/files-count",
        permanent: true,
      },
      {
        source: "/dasboard",
        destination: "/import-check/files-count",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
