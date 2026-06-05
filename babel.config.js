module.exports = function (api) {
  api.cache(true);
  return {
    // jsxImportSource: 'nativewind' 으로 className -> style 변환 활성화.
    // NOTE: react-native-worklets/plugin(reanimated 4)은 babel-preset-expo SDK56가
    // 패키지 설치를 감지해 자동 주입하므로 여기서 중복 추가하지 않는다.
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
  };
};
