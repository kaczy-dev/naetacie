/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    dirs: ['app', 'components', 'lib'],
  },
  // Disable X-Powered-By header (information disclosure)
  poweredByHeader: false,
  webpack: (config) => {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/functions/**', '**/node_modules/**'],
    };
    return config;
  },
};

module.exports = nextConfig;
