/// <reference types="vitest/config" />
import { getViteConfig } from 'astro/config'
import site from './astro.config.mjs'

// The site's tests run on the site's own Astro config, so they can render .astro pages through
// Astro's Container API (Astro's testing guide: getViteConfig + experimental_AstroContainer).
// The config is passed in: getViteConfig does not read astro.config.mjs by itself here, and the pages would then be
// compiled with Astro's defaults instead of the site's (compressHTML, which decides how the pages' text reads).
// The repository root's vitest has no Astro compiler and does not run anything under apps/transfer.
// test/build-site.ts builds the site once per run, for the tests that read what the build wrote.
export default getViteConfig(
  {
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts', 'test/**/*.test.ts'],
      globalSetup: ['test/build-site.ts'],
    },
  },
  site,
)
