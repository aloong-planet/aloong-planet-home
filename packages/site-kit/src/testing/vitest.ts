import { defineConfig } from 'vitest/config'

/** The Vitest configuration of a site: unit tests next to the modules they test (src/), and the built-site check (test/) */
export const siteTests = defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
    globalSetup: ['test/build-site.ts']
  }
})
