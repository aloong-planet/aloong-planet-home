// ESLint for the Worker: the official recommended sets only, the rules the Worker's modules were linted with in
// aloong-planet/agentshed before they moved here.
//
// - `@eslint/js` recommended, plus typescript-eslint `recommendedTypeChecked` with its type-aware rules turned off: the
//   modules are plain JavaScript, which belongs to no tsconfig.
// - `@typescript-eslint/no-unused-vars`, where a leading underscore marks a parameter that is unused on purpose.
//
// The `lint` script runs with `--max-warnings 0`: a warning that does not fail the run is a rule that is on in name
// only.
import { fileURLToPath } from 'node:url'
import { defineConfig, includeIgnoreFile } from 'eslint/config'
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import globals from 'globals'

export default defineConfig(
  // Whatever git ignores is not linted. ESLint does not read .gitignore on its own; `gitignoreResolution` resolves the
  // patterns against the repository's .gitignore, which ignores node_modules/, as git does.
  includeIgnoreFile(fileURLToPath(new URL('../../.gitignore', import.meta.url)), { gitignoreResolution: true }),
  js.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
    }
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: { globals: globals.node }
  }
)
