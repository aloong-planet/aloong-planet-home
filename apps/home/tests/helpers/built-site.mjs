import {cp, mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildBlog} from '../../scripts/blog.mjs';
import {buildHomepage} from '../../scripts/homepage.mjs';
import {buildPages} from '../../scripts/pages.mjs';
const repo = fileURLToPath(new URL('../..', import.meta.url));
let built;
/** The repository templates and posts, built once per test process for read-only checks. The steps are the build script's, in its order. */
export const realSite = () => built ??= (async () => {
  const outDir = join(await mkdtemp(join(tmpdir(), 'blog-real-')), 'out');
  await cp(join(repo, 'public'), outDir, {recursive:true});
  await buildPages({outDir});
  await buildBlog({contentDir:join(repo, 'content'), outDir});
  await buildHomepage({outDir});
  return outDir;
})();
