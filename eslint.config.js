const config = require('@rubensworks/eslint-config');

module.exports = config([
  {
    files: [ '**/*.ts' ],
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: __dirname,
        project: [ './tsconfig.eslint.json' ],
      },
    },
  },
  {
    rules: {
      'import/no-nodejs-modules': 'off',
      'ts/no-unsafe-assignment': 'off',
    },
  },
  {
    files: [
      'test/**/*-test.ts',
    ],
    rules: {
      'jest/no-untyped-mock-factory': 'off',
    },
  },
]);
