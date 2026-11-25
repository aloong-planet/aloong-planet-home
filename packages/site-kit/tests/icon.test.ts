// The icon component both sites draw their download button's icon with: what it renders is what each site's built
// pages already contain, so these cases pin that markup (shared-site-packages: neither site's output changes).
import { experimental_AstroContainer as AstroContainer } from 'astro/container'
import { JSDOM } from 'jsdom'
import { describe, expect, test } from 'vitest'
import Icon from '../src/Icon.astro'

async function render(props: { name: 'download'; size: number }): Promise<SVGSVGElement> {
  const container = await AstroContainer.create()
  const html = await container.renderToString(Icon, { props })
  const svg = new JSDOM(html).window.document.querySelector('svg')
  if (!svg) throw new Error(`no svg in ${html}`)
  return svg
}

describe('the svg', () => {
  // 15 and 18 are the two sizes the sites draw it at
  test.each([15, 18])('size %i: width and height are the size, on the 24-unit grid Lucide draws on', async (size) => {
    const svg = await render({ name: 'download', size })
    expect(svg.getAttribute('width')).toBe(String(size))
    expect(svg.getAttribute('height')).toBe(String(size))
    expect(svg.getAttribute('viewBox')).toBe('0 0 24 24')
  })

  test('it is drawn in the colour of the text around it and is hidden from assistive technology', async () => {
    const svg = await render({ name: 'download', size: 18 })
    expect(svg.getAttribute('stroke')).toBe('currentColor')
    expect(svg.getAttribute('fill')).toBe('none')
    expect(svg.getAttribute('aria-hidden')).toBe('true')
  })
})

describe('the download icon', () => {
  test("is Lucide's, as its three paths in order", async () => {
    const svg = await render({ name: 'download', size: 18 })
    const paths = [...svg.querySelectorAll('path')].map((p) => p.getAttribute('d'))
    expect(paths).toEqual(['M12 15V3', 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'm7 10 5 5 5-5'])
  })
})
