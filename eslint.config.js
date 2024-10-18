import js from '@eslint/js'
import vuePlugin from 'eslint-plugin-vue'
import tsPlugin from '@typescript-eslint/eslint-plugin'
import tsParser from '@typescript-eslint/parser'
import prettierPlugin from 'eslint-plugin-prettier'
import globals from 'globals'
import vueParser from 'vue-eslint-parser'

export default [
  js.configs.recommended,
  {
    ignores: ['**/dist/**', '**/node_modules/**', '**/*.min.js']
  },
  {
    files: ['**/*.{js,mjs,cjs,jsx,ts,tsx,vue}'],
    plugins: {
      '@typescript-eslint': tsPlugin,
      prettier: prettierPlugin
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module'
      },
      globals: {
        ...globals.browser,
        ...globals.es2020,
        ...globals.node
      }
    },
    rules: {
      'prettier/prettier': 'error',
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-undef': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-empty-interface': 'warn',
      'vue/multi-word-component-names': 'off',
      'vue/comment-directive': 'off'
    }
  },
  {
    files: ['**/*.vue'],
    plugins: {
      vue: vuePlugin
    },
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tsParser,
        extraFileExtensions: ['.vue'],
        ecmaVersion: 2020,
        sourceType: 'module'
      }
    },
    rules: {
      ...vuePlugin.configs.base.rules,
      ...vuePlugin.configs['vue3-recommended'].rules,
      'vue/multi-word-component-names': 'off',
      'vue/no-unused-vars': 'warn',
      'vue/comment-directive': 'off'
    }
  }
]
