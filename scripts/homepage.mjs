// Fills the homepage's Agents section from the works the navigation menus list, so the section is part of the delivered
// page and lists the same works (nav-menus::CON-001, nav-menus::REQ-002).
import {readFile, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {SITE_WORKS, escapeHtml} from '../public/navigation.js';

const AGENTS_SLOT = '<!-- agents:groups -->';

const entry = work => `<li><a class="ap-agent" href="${escapeHtml(work.href)}" target="_blank" rel="noreferrer"><strong>${escapeHtml(work.name)}</strong><span>${escapeHtml(work.text)}</span></a></li>`;
const renderGroups = () => `<div class="ap-agent-groups">${SITE_WORKS.agents.map(({group, works}) => `<div class="ap-agent-group"><h3>${escapeHtml(group)}</h3><ul class="ap-agent-list">${works.map(entry).join('')}</ul></div>`).join('')}</div>`;

/** Writes the Agents section into outDir's homepage, which already holds the copied public files. */
export async function buildHomepage({outDir}) {
  const path = join(outDir, 'index.html');
  const template = await readFile(path, 'utf8');
  if (!template.includes(AGENTS_SLOT)) throw new Error(`${path} has no ${AGENTS_SLOT} slot for the Agents section.`);
  await writeFile(path, template.replace(AGENTS_SLOT, renderGroups));
}
