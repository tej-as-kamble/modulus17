module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    // react-native-reanimated/plugin MUST be listed last.
    // It registers the worklet runtime required by ReanimatedSwipeable.
    'react-native-reanimated/plugin',
  ],
};
