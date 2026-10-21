import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'node_modules', 'test-results', 'playwright-report']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, tseslint.configs.recommended, reactHooks.configs.flat.recommended],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
  {
    // ADR-001: the engine is pure. No UI, network, or AI SDKs.
    files: ['src/engine/**/*.ts', 'src/location/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', { patterns: ['react', 'react-dom', '../ui/*', '../scenario/*', 'node:*', '@supabase/*', '@anthropic-ai/*', 'openai'] }],
      'no-restricted-globals': ['error', 'fetch', 'Date', 'localStorage', 'window', 'document'],
      'no-restricted-properties': ['error', { object: 'Math', property: 'random' }],
    },
  },
  {
    // BEDMAS made explicit: any expression mixing arithmetic operators of different precedence must use brackets.
    files: ['src/engine/**/*.ts', 'src/tracker/**/*.ts', 'src/scenario/**/*.ts', 'src/location/**/*.ts'],
    rules: { 'no-mixed-operators': ['error', { groups: [['+', '-', '*', '/', '%', '**']], allowSamePrecedence: true }] },
  },
])
