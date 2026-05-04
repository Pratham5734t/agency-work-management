import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // We co-locate small components, providers, and hooks in single files
      // for ergonomics. Disable the strict Fast Refresh rule that asks every
      // file to export only components.
      'react-refresh/only-export-components': 'off',
      // The React Compiler check is noisy on intentional manual memoization;
      // we'll re-enable it once we adopt the compiler explicitly.
      'react-hooks/preserve-manual-memoization': 'off',
    },
  },
])
