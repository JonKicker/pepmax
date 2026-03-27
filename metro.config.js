// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Exclude non-app directories from Metro's file watcher to speed up bundling.
// pepmax-ui-ux-workspace contains design iteration outputs that are not part of the app.
config.watchFolders = config.watchFolders || [];
config.resolver.blockList = [
  ...(Array.isArray(config.resolver.blockList) ? config.resolver.blockList : config.resolver.blockList ? [config.resolver.blockList] : []),
  /pepmax-ui-ux-workspace\/.*/,
];

module.exports = config;
