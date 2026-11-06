// ESLint flat configuration (ESLint 9)
const js = require('@eslint/js');
const globals = require('globals');

module.exports = [
  {
    ignores: ['node_modules/', 'data/', 'coverage/'],
  },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
        ...globals.commonjs,
      },
    },
    rules: {
      // Report unused variables without failing the lint run; formatting
      // decisions are delegated to Prettier
      'no-unused-vars': 'warn',
    },
  },
];
