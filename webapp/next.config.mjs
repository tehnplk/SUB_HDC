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
  env: {
    CENTER_NAME: process.env.CENTER_NAME || "เมือง",
  },
};

export default nextConfig;
