module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module:react-native-dotenv',
      {
        moduleName: '@env',
        path: '.env',
        safe: true,
        // ML_API_URL y ML_API_KEY quedan vacías mientras no exista la API.
        allowUndefined: true,
      },
    ],
  ],
};
