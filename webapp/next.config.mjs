/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: "/dashbord/hos-list",
        destination: "/dashboard/hos-list",
        permanent: true,
      },
      {
        source: "/dasboard/file-list",
        destination: "/dashboard/file-list",
        permanent: true,
      },
      {
        source: "/dashbord/file-list",
        destination: "/dashboard/file-list",
        permanent: true,
      },
      {
        source: "/dasboard/hos-list",
        destination: "/dashboard/hos-list",
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
        destination: "/dashboard/hos-list",
        permanent: true,
      },
      {
        source: "/dashbord",
        destination: "/dashboard/hos-list",
        permanent: true,
      },
      {
        source: "/dasboard",
        destination: "/dashboard/hos-list",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
