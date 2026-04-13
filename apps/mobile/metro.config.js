const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch all workspace packages so Metro can serve files outside the app root
config.watchFolders = [monorepoRoot];

// Resolve node_modules from the app first, then fall back to the monorepo root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Required for pnpm symlinks to work correctly
config.resolver.unstable_enableSymlinks = true;

module.exports = config;
