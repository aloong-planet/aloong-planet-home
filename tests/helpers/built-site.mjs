import {cp, mkdtemp} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildBlog} from '../../scripts/blog.mjs';
import {buildHomepage} from '../../scripts/homepage.mjs';
const repo = fileURLToPath(new URL('../..', import.meta.url));
let built;
/** The repository templates and posts, built once per test process for read-only checks. */
export const realSite = () => built ??= (async () => {
  const outDir = join(await mkdtemp(join(tmpdir(), 'blog-real-')), 'out');
  await cp(join(repo, 'public'), outDir, {recursive:true});
  await buildBlog({contentDir:join(repo, 'content'), outDir});
  await buildHomepage({outDir});
  return outDir;
})();
