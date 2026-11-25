// @ts-check
import { defineConfig } from 'astro/config'

// 站点最终地址(自定义域绑好后改这里;先用 pages.dev 占位也可）
export default defineConfig({
  site: 'https://transfer.aloongplanet.com',
  // 中文为默认(根路径),英文在 /en 前缀下
  i18n: {
    defaultLocale: 'zh',
    locales: ['zh', 'en'],
    routing: {
      prefixDefaultLocale: false, // zh 在 /,en 在 /en
    },
  },
  // Collapse whitespace as Astro 4 did. The default of Astro 7 is "jsx", which trims a line break between text and an
  // inline element (`through<a>GitHub Issues</a>.`) where Astro 4 kept it as a space, so the pages would read
  // differently (app-sites::REQ-002/AC-02).
  compressHTML: true,
  build: {
    inlineStylesheets: 'auto',
  },
  vite: {
    server: {
      proxy: {
        '/__download-statistics': {
          target: 'https://dl.aloongplanet.com',
          changeOrigin: true,
          rewrite: () => '/stats/downloads.json',
        },
      },
    },
  },
})
