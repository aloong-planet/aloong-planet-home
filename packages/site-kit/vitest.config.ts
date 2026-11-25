import { getViteConfig } from 'astro/config'

// The package's tests render the icon component, so Vitest goes through Astro's own Vite setup, which compiles .astro files
export default getViteConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts']
  }
})
