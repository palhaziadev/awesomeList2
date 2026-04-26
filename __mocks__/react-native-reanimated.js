const React = require('react');
const { View, Text, ScrollView } = require('react-native');

const Animated = {
  View,
  Text,
  ScrollView,
  createAnimatedComponent: (component) => component,
};

const LinearTransition = { delay: () => LinearTransition };
const SlideInLeft = { delay: () => SlideInLeft };
const SlideOutRight = {};
const FadeIn = { duration: () => FadeIn };
const FadeOut = { duration: () => FadeOut };

module.exports = {
  __esModule: true,
  default: Animated,
  Animated,
  LinearTransition,
  SlideInLeft,
  SlideOutRight,
  FadeIn,
  FadeOut,
  useSharedValue: (init) => ({ value: init }),
  useAnimatedStyle: (fn) => fn(),
  withTiming: (val) => val,
  withSpring: (val) => val,
  runOnJS: (fn) => fn,
};
