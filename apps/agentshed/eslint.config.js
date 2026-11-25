// ESLint for the site: the official recommended sets only, plus one rule of the site's own (below).
//
// - `@eslint/js` recommended, plus typescript-eslint `recommendedTypeChecked`, the type-aware set: the bugs worth a
//   linter here (a floating Promise in a test, a value typed `any` flowing on) are only visible with type information.
//   `projectService` finds this package's tsconfig.json for each file.
// - Plain JS (this file, astro.config.mjs, the lint rule's test) belongs to no tsconfig, so the type-aware rules are
//   off there. `.astro` files are not linted at all.
//
// The `lint` script runs with `--max-warnings 0`: a warning that does not fail the run is a rule that is on in name
// only.
//
// An exemption is turned off here only for a framework constraint, scoped to the files it applies to and saying what
// retires it; there is none today. A finding that needs a judgement and a test is not turned off at the rule: the site
// carries an inline `eslint-disable-next-line <rule> -- see #N`, so the rule stays on for new code, and an inline
// directive that no longer matches a violation is reported as unused and fails the run.
import { fileURLToPath } from 'node:url'
import { defineConfig, includeIgnoreFile } from 'eslint/config'
import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import globals from 'globals'

// A config object that sets `no-restricted-syntax` replaces the options an earlier one gave it rather than adding to
// them, so the one below lists every selector that holds for its files. The files match each extension a source file
// could take, not .ts alone: a .js file added beside the TypeScript would otherwise be linted with none of the rules,
// and a .jsx file not linted at all.
const sourceExts = '{ts,tsx,mts,cts,js,jsx,mjs,cjs}'

// One way into a browser for the site's cases: visit() in test/support/browser.ts (the reason is in its header).
// Nothing else in this package names a Playwright package, written whole as a string or a template with no
// substitution: as the source of an import, a re-export (`import x = require()` too) or an import(), as an expression
// or as a type, or to a call, as require(), a require made by createRequire() or any other loader takes it. What it
// cannot see, each form linted in a probe beside a form it reports: a name built at run time or reaching the loader any
// other way (held in a variable, built from parts or with a substitution, wrapped in `as` or a conditional, in an
// array, a tagged template, code in a string for eval or new Function); a path specifier, into node_modules or
// anywhere else; a module that loads Playwright in turn, a file outside this package or a package of another name; and
// anything in an .astro file, which is not linted at all. Nor, though these load nothing, a name in a comment (a
// triple-slash reference, a JSDoc import() type or @import) or in a `declare module` block.
const SITE_BROWSER = 'Open the site in a browser through visit() in test/support/browser.ts.'
const playwrightModule = '^(@playwright/|playwright(-core)?($|/))'
// A selector's regex ends at its first unescaped slash, so each slash in the pattern is escaped there
const playwrightInSelector = `/${playwrightModule.replaceAll('/', '\\x2F')}/`
const playwrightLoaded = [{
  selector: [
    `ImportExpression > Literal.source[value=${playwrightInSelector}]`,
    `ImportExpression > TemplateLiteral.source > TemplateElement[value.raw=${playwrightInSelector}]`,
    `TSImportType > Literal.source[value=${playwrightInSelector}]`,
    `TSImportType > TemplateLiteral.source > TemplateElement[value.raw=${playwrightInSelector}]`,
    `CallExpression > Literal.arguments[value=${playwrightInSelector}]`,
    `CallExpression > TemplateLiteral.arguments > TemplateElement[value.raw=${playwrightInSelector}]`
  ].join(', '),
  message: SITE_BROWSER
}]

export default defineConfig(
  // Whatever git ignores is not linted: build output, Astro's generated types, local scratch files. ESLint does not
  // read .gitignore on its own, and a directory missing from a hand-kept list is linted in a working checkout while a
  // clean one (CI, a fresh worktree) never has it. `gitignoreResolution` resolves the patterns against each
  // .gitignore's own location, as git does: this package's, and the repository's, which ignores dist/ and node_modules/.
  includeIgnoreFile(fileURLToPath(new URL('../../.gitignore', import.meta.url)), { gitignoreResolution: true }),
  includeIgnoreFile(fileURLToPath(new URL('.gitignore', import.meta.url)), { gitignoreResolution: true }),
  js.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname }
    },
    rules: {
      // Same convention as tsc's noUnusedParameters: a leading underscore marks a parameter that is unused on purpose
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
    }
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: { globals: globals.node }
  },
  {
    files: [`**/*.${sourceExts}`],
    rules: {
      'no-restricted-imports': ['error', { patterns: [{ regex: playwrightModule, message: SITE_BROWSER }] }],
      'no-restricted-syntax': ['error', ...playwrightLoaded]
    }
  },
  {
    files: ['test/support/browser.ts'],
    rules: { 'no-restricted-imports': 'off', 'no-restricted-syntax': 'off' }
  }
)
