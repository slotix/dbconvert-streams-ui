import js from '@eslint/js';
import vuePlugin from 'eslint-plugin-vue';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import prettierPlugin from 'eslint-plugin-prettier';
import globals from 'globals';

export default [
  js.configs.recommended,
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/*.min.js'],
  },
  {
    files: ['**/*.{js,mjs,cjs,jsx,ts,tsx,vue}'],
    plugins: {
      vue: vuePlugin,
      '@typescript-eslint': tsPlugin,
      prettier: prettierPlugin,
    },
    languageOptions: {
      parser: vuePlugin.parser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
        extraFileExtensions: ['.vue'],
      },
      globals: {
        ...globals.browser,
        ...globals.es2020,
      },
    },
    rules: {
      'prettier/prettier': 'error',
      'no-unused-vars': 'warn',
      'no-undef': 'warn',
      'vue/multi-word-component-names': 'off',
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.json',
      },
    },
    rules: {
      ...tsPlugin.configs['recommended'].rules,
    },
  },
  {
    files: ['*.config.js', 'vite.config.js', 'vitest.config.js'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
];
