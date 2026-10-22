import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default defineConfig(
  { ignores: ['dist/', 'export/', 'node_modules/'] },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      // The codebase is functional: factory functions and closures instead of classes.
      'no-restricted-syntax': [
        'error',
        { selector: 'ClassDeclaration, ClassExpression', message: 'Use a factory function instead of a class.' },
        { selector: 'ThisExpression', message: 'Use a closure instead of `this`.' },
      ],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
);
