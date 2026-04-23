const React = require('react');
const { View } = require('react-native');

const Svg = (props) => React.createElement(View, props);
const mock = (name) => (props) => React.createElement(View, props);

module.exports = {
  __esModule: true,
  default: Svg,
  Svg,
  Circle: mock('Circle'),
  ClipPath: mock('ClipPath'),
  Defs: mock('Defs'),
  Ellipse: mock('Ellipse'),
  G: mock('G'),
  Image: mock('Image'),
  Line: mock('Line'),
  LinearGradient: mock('LinearGradient'),
  Path: mock('Path'),
  Pattern: mock('Pattern'),
  Polygon: mock('Polygon'),
  Polyline: mock('Polyline'),
  RadialGradient: mock('RadialGradient'),
  Rect: mock('Rect'),
  Stop: mock('Stop'),
  Symbol: mock('Symbol'),
  Text: mock('Text'),
  TextPath: mock('TextPath'),
  TSpan: mock('TSpan'),
  Use: mock('Use'),
};
