// The lint rule that keeps the site's browser cases on visit() (eslint.config.js, the last two blocks): each way of
// loading Playwright it refuses is reported, by this package's own config, at the line that takes it, in each kind of
// file of the package; test/support/browser.ts itself and a module merely named like Playwright are not. A selector or
// a block's files edited to look narrower turns a row here red. The snippets are linted as files that need not exist;
// type information is off for them (the rule reads none), so a snippet needs no tsconfig.
//
// Gap: the snippets are not the package's code. That every file of the package passes is `pnpm run lint`'s own run;
// what the rule does not see is listed above it in eslint.config.js. A file outside the package is not linted by this
// config at all, so no row here says a file outside it is let through.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'
import { ESLint } from 'eslint'
import tseslint from 'typescript-eslint'

const eslint = new ESLint({ cwd: fileURLToPath(new URL('..', import.meta.url)), overrideConfig: tseslint.configs.disableTypeChecked })

const SITE_BROWSER = 'Open the site in a browser through visit() in test/support/browser.ts.'
const PROBE = 'test/probe.test.ts'
const BROWSER_TS = 'test/support/browser.ts'

/** The lines a snippet's file gets the rule's message at, after checking it is linted and parses */
async function reported(file, lines) {
  assert.equal(await eslint.isPathIgnored(file), false, `${file} is linted`)
  const [result] = await eslint.lintText(lines.join('\n'), { filePath: file })
  assert.deepEqual(result.messages.filter((m) => m.fatal), [], 'the snippet parses')
  return [...new Set(result.messages.filter((m) => m.message.endsWith(SITE_BROWSER)).map((m) => m.line))]
}

/** The lines marked `// reported`, one-based */
const marked = (lines) => lines.flatMap((line, i) => (line.endsWith('// reported') ? [i + 1] : []))

const REQUIRE = ["import { createRequire } from 'node:module'"]
// Every form, as a module file of the package can take it
const EVERY_FORM = [
  "import { chromium } from 'playwright'",
  "import type { Page } from 'playwright'",
  "export { chromium } from 'playwright'",
  "export * from 'playwright'",
  "type P = import('playwright').Page",
  "void import('playwright')",
  ...REQUIRE,
  "createRequire(import.meta.url)('playwright')"
]

const cases = [
  // Each form, in a test file of the package
  ...[
    "import { chromium } from 'playwright' // reported",
    "import type { Page } from 'playwright' // reported",
    "import * as pw from 'playwright' // reported",
    "export { chromium } from 'playwright' // reported",
    "export * from 'playwright' // reported",
    "import { test } from '@playwright/test' // reported",
    "import { expect } from 'playwright/test' // reported",
    "import { chromium } from 'playwright-core' // reported",
    "const p = import('playwright') // reported",
    'const p = import(`playwright`) // reported',
    "const p = import('@playwright/test') // reported",
    "type P = import('playwright').Page // reported",
    'type P = import(`playwright`).Page // reported'
  ].map((line) => ({ name: `site: ${line.replace(' // reported', '')}`, file: PROBE, lines: [line] })),
  { name: 'site: a require made by createRequire, called at once', file: PROBE,
    lines: [...REQUIRE, "const { chromium } = createRequire(import.meta.url)('playwright') // reported"] },
  { name: 'site: a require made by createRequire, kept under another name', file: PROBE,
    lines: [...REQUIRE, 'const load = createRequire(import.meta.url)', "const pw = load('playwright') // reported", 'const core = load(`playwright-core`) // reported'] },
  { name: 'site: require() in a CommonJS file', file: 'scripts/probe.cjs',
    lines: ["const { chromium } = require('playwright') // reported"] },
  // Each kind of file of the package, and a file of each extension a source file could take
  ...['src/probe.ts', 'test/support/probe.ts', 'probe.config.mjs',
    ...['ts', 'tsx', 'mts', 'cts', 'js', 'jsx', 'mjs'].map((ext) => `test/probe.${ext}`)
  ].map((file) => ({ name: `an import in ${file}`, file, lines: ["import { chromium } from 'playwright' // reported", "void import('playwright') // reported"] })),
  { name: 'an import in test/probe.cjs', file: 'test/probe.cjs', lines: ["require('playwright') // reported", "void import('playwright') // reported"] },
  // Not reported: the harness itself, and a module named like Playwright but not it
  { name: 'test/support/browser.ts itself is not reported', file: BROWSER_TS, lines: EVERY_FORM },
  { name: 'a module named like Playwright is not reported', file: PROBE,
    lines: ["import { a } from 'playwrightish'", "import { b } from '@playwrights/kit'", "void import('my-playwright')", ...REQUIRE,
      "createRequire(import.meta.url)('playwright-corex')"] }
]

for (const { name, file, lines } of cases) {
  test(name, async () => {
    assert.deepEqual(await reported(file, lines), marked(lines))
  })
}
