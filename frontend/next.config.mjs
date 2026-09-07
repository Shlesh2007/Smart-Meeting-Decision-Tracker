/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ['antd', '@ant-design/icons', 'date-fns', 'recharts', 'lucide-react'],
  },
};

export default nextConfig;
