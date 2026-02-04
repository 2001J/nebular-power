let userConfig = undefined
try {
  userConfig = await import('./v0-user-next.config')
} catch (e) {
  // ignore error
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // Enable ESLint during production builds so errors fail the build
    ignoreDuringBuilds: false,
    // Limit lint scope to project source directories
    dirs: ['app', 'components', 'hooks', 'lib', 'pages', 'types', '__tests__'],
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
  },
  // Enable standalone output mode for containerization
  output: 'standalone',
  // Add rewrites for API proxy to solve CORS issues
  async rewrites() {
    // Use NEXT_PUBLIC_API_URL if set (Docker sets this), otherwise default to localhost
    // Docker Compose will override this with http://backend:8080 via environment variable
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
    
    console.log(`Using API base URL: ${apiBaseUrl}`);
    
    // If API URL points to localhost:3000, don't proxy (used for E2E tests with mocks)
    if (apiBaseUrl === 'http://localhost:3000') {
      console.log('Skipping API proxy - E2E test mode with mocks');
      return [];
    }
    
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
