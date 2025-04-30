let userConfig = undefined
try {
  userConfig = await import('./v0-user-next.config')
} catch (e) {
  // ignore error
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Enable standalone output mode for containerization
  output: 'standalone',
  experimental: {
    webpackBuildWorker: true,
    parallelServerBuildTraces: true,
    parallelServerCompiles: true,
  },
  // Add rewrites for API proxy to solve CORS issues
  async rewrites() {
    // Determine if we're in development or production
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 
                      (process.env.NODE_ENV === 'production' 
                        ? 'http://backend:8080' 
                        : 'http://localhost:8080');
    
    console.log(`Using API base URL: ${apiBaseUrl}`);
    
    return [
      {
        source: '/api/:path*',
        destination: `${apiBaseUrl}/api/:path*`,
      },
      {
        source: '/monitoring/:path*',
        destination: `${apiBaseUrl}/monitoring/:path*`,
      }
    ];
  },
  webpack: (config, { isServer }) => {
    // Fix for NodeJS modules used in browser context
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        "supports-color": false,
        child_process: false,
      };
    }

    return config;
  },
}

if (userConfig) {
  // ESM imports will have a "default" property
  const config = userConfig.default || userConfig

  for (const key in config) {
    if (
      typeof nextConfig[key] === 'object' &&
      !Array.isArray(nextConfig[key])
    ) {
      nextConfig[key] = {
        ...nextConfig[key],
        ...config[key],
      }
    } else {
      nextConfig[key] = config[key]
    }
  }
}

export default nextConfig
