
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  webpack: (config, { isServer, webpack }) => {
    // Fix for 'async_hooks' module not found error.
    // This module is Node.js specific and should not be bundled for the client.
    // OpenTelemetry SDK for Node.js (a dependency of Genkit) uses it.
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        async_hooks: false,
        fs: false, // Add fs: false to prevent bundling 'fs' module on client
        net: false, // Also common to add for Node.js specific modules
        tls: false, // Also common to add for Node.js specific modules
      };
    }

    // For Node.js gRPC packages that might be pulled in by Google AI / Genkit
    // These are server-side only and can cause issues if Next.js tries to bundle them for the client.
    // config.externals is a list of modules to exclude from bundles.
    // In this case, we are telling webpack that if it sees an import for 'grpc',
    // it should be treated as an external dependency (not bundled).
    // This is often necessary for packages that are designed to run in a Node.js environment.
    if (isServer) {
        // Keep existing server-side externals and add new ones if necessary
        // For now, no specific server-side externals are added beyond what Next.js handles by default
        // unless a specific issue arises.
    } else {
        // For client-side, ensure problematic Node.js built-ins or packages are handled.
        // We already handled async_hooks and fs. If other similar errors appear for modules like 'net', 'tls',
        // they can be added here:
        // net: false,
        // tls: false,
    }
    
    // Ensure that node-pre-gyp related paths are correctly ignored for client bundles
    // to prevent errors with packages like fsevents (macOS specific) or other native modules.
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /node-pre-gyp\.js$/,
        contextRegExp: /.*/,
      })
    );


    // Important: return the modified config
    return config;
  },
};

export default nextConfig;

