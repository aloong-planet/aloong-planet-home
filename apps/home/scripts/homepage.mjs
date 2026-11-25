// Fills the homepage's Agents section, in each language, from the works the navigation menus list, so the section is part of
// the delivered page and lists the same works (nav-menus::CON-001, nav-menus::REQ-002).
import {readFile, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {escapeHtml} from '../public/navigation.js';
import {ui} from '../public/ui.js';
import {AGENTS_SLOT, LANGUAGE_LIST, pageFile} from './pages.mjs';

const entry = work => `<li><a class="ap-agent" href="${escapeHtml(work.href)}" target="_blank" rel="noreferrer"><strong>${escapeHtml(work.name)}</strong><span>${escapeHtml(work.text)}</span></a></li>`;
const renderGroups = lang => `<div class="ap-agent-groups">${ui[lang].works.agents.map(({group, works}) => `<div class="ap-agent-group"><h3>${escapeHtml(group)}</h3><ul class="ap-agent-list">${works.map(entry).join('')}</ul></div>`).join('')}</div>`;

/** Writes the Agents section into each language's homepage in outDir, which already holds the pages. */
export async function buildHomepage({outDir}) {
  for (const lang of LANGUAGE_LIST) {
    const path = join(outDir, pageFile(lang, 'index'));
    const template = await readFile(path, 'utf8');
    if (!template.includes(AGENTS_SLOT)) throw new Error(`${path} has no ${AGENTS_SLOT} slot for the Agents section.`);
    await writeFile(path, template.replace(AGENTS_SLOT, () => renderGroups(lang)));
  }
}
