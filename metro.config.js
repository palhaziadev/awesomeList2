// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require("expo/metro-config");
const { mergeConfig } = require("metro-config");
const { withNativeWind } = require("nativewind/metro");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

const testBlockConfig = {
  resolver: {
    blockList: [/.*\.test\.[jt]sx?$/, /.*\.spec\.[jt]sx?$/],
  },
};

module.exports = withNativeWind(mergeConfig(config, testBlockConfig), {
  input: "./global.css",
  inlineRem: 16,
});
