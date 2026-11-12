import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { setInfo } from '../../../../lib/swu-resources/set-info.ts';
import type { SwuSet } from '../../../../types/enums.ts';
import { compareNumbers, type ChecklistCard, type ChecklistPrinting } from './rows.ts';

// Playwright installs this headless PDF-capable binary alongside full Chromium.
const { registry } = require('playwright-core/lib/server/registry/index');

const escape = Bun.escapeHTML;
const mainTreatments = ['Standard', 'Standard Foil', 'Hyperspace', 'Hyperspace Foil'];
const paperSizes = ['A4', 'Letter'] as const;
const layouts = ['Card grid', 'Printing list'] as const;

function numberLabel(printing: ChecklistPrinting, set: SwuSet) {
  const number = String(printing.number).padStart(3, '0');
  const setNumber = printing.set === set ? number : `${printing.set.toUpperCase()} ${number}`;
  return printing.token ? `Token ${setNumber}` : setNumber;
}

function cardGrid(set: SwuSet, cards: ChecklistCard[]) {
  const treatments = new Set(cards.flatMap(card => card.printings.map(p => p.treatment)));
  const columns = mainTreatments.filter(t => treatments.has(t));
  const hasOthers = treatments.size > columns.length;
  const mark = (p: ChecklistPrinting, label: string) =>
    `<span class="mark"><i></i>${escape(label)}${escape(numberLabel(p, set))}</span>`;
  const rows = cards.map(card => {
    const cells = columns.map(t => {
      const matching = card.printings.filter(p => p.treatment === t);
      return `<td>${matching.map(p => mark(p, '')).join(' ')}</td>`;
    });
    if (hasOthers) {
      const others = card.printings.filter(p => !columns.includes(p.treatment));
      cells.push(`<td>${others.map(p => mark(p, p.treatment + ' ')).join(' ')}</td>`);
    }
    return `<tr><td>${escape(numberLabel(card.first, set))}</td><td>${escape(card.name)}</td>${cells.join('')}</tr>`;
  });
  return `<table><colgroup><col style="width:8%"><col>${columns.map(() => '<col style="width:10%">').join('')}${hasOthers ? '<col style="width:28%">' : ''}</colgroup>
    <thead><tr><th>No.</th><th>Card</th>${columns.map(t => `<th>${t}</th>`).join('')}${hasOthers ? '<th>Other printings</th>' : ''}</tr></thead>
    <tbody>${rows.join('')}</tbody></table>`;
}

function printingList(set: SwuSet, cards: ChecklistCard[]) {
  const entries = cards.flatMap(card =>
    card.printings.map(printing => ({ name: card.name, printing })),
  );
  entries.sort(
    (a, b) =>
      compareNumbers(a.printing, b.printing, set) ||
      a.name.localeCompare(b.name) ||
      a.printing.treatment.localeCompare(b.printing.treatment),
  );
  return `<ul>${entries.map(({ name, printing }) => `<li><i></i><span class="number">${escape(numberLabel(printing, set))}</span><span>${escape(name)}<small>${escape(printing.treatment)}</small></span></li>`).join('')}</ul>`;
}

export function getChecklistDocuments(set: SwuSet, cards: ChecklistCard[]) {
  return layouts.flatMap(layout => {
    const body = layout === 'Card grid' ? cardGrid(set, cards) : printingList(set, cards);
    const name = escape(setInfo[set].name);
    return paperSizes.map(paper => ({
      layout,
      paper,
      filename: `${set}-${layout === 'Card grid' ? 'cards' : 'printings'}-${paper.toLowerCase()}.pdf`,
      html: `<!doctype html><html lang="en"><head><meta charset="utf-8">
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'">
      <title>${name} – ${layout}</title><style>
      @page {
        size: ${paper}; margin: 20mm 10mm 14mm; font: 8pt Arial,sans-serif;
        @top-left { content: ${JSON.stringify(setInfo[set].name).replaceAll('<', '\\3c ')}; font-size: 14pt; font-weight: bold; }
        @top-right { content: "${layout}"; font-size: 10pt; }
        @bottom-left { content: "SWUBase · ${set.toUpperCase()}"; }
        @bottom-right { content: "Page " counter(page) " of " counter(pages); }
      }
      * {box-sizing:border-box} body {margin:0;color:#171717;font:9pt/1.2 Arial,sans-serif}
      i {display:inline-block;width:3.5mm;height:3.5mm;flex:none;border:.7pt solid #444}
      table {width:100%;border-collapse:collapse;table-layout:fixed} tr,li {break-inside:avoid}
      td,th {padding:1.3mm 1mm;text-align:left;border-bottom:.4pt solid #aaa}
      th {font-size:8pt;vertical-align:bottom;border-bottom:1pt solid #444}
      td:first-child,.number,small {font-size:8pt;color:#444}
      .mark {display:inline-flex;align-items:center;gap:.9mm;font-size:8pt}
      ul {margin:0;padding:0;list-style:none;columns:2;column-gap:7mm;column-fill:auto}
      li {display:grid;grid-template-columns:3.5mm 10mm 1fr;align-items:center;gap:1.5mm;padding:1mm 0;border-bottom:.4pt solid #aaa}
      small {display:block;margin-top:.4mm}
      </style></head><body>${body}</body></html>`,
    }));
  });
}

export async function renderChecklistPdfs(documents: ReturnType<typeof getChecklistDocuments>) {
  const executable: string = registry
    .findExecutable('chromium-headless-shell')
    .executablePathOrDie('javascript');
  const dir = await mkdtemp(join(tmpdir(), 'swubase-set-checklists-'));
  try {
    const pdfs: Buffer[] = [];
    for (const doc of documents) {
      const html = join(dir, 'checklist.html');
      const pdf = join(dir, doc.filename);
      await writeFile(html, doc.html);
      // Print directly to disk. Large checklists can stall the DevTools pipe
      // between Playwright and Chromium on Bun.
      const child = Bun.spawn(
        [
          executable,
          '--single-process',
          '--no-zygote',
          '--disable-gpu',
          '--no-sandbox',
          '--disable-dev-shm-usage',
          '--disable-background-networking',
          '--no-pdf-header-footer',
          `--user-data-dir=${join(dir, 'profile')}`,
          `--print-to-pdf=${pdf}`,
          pathToFileURL(html).href,
        ],
        { stdin: 'ignore', stdout: 'ignore', stderr: 'ignore' },
      );
      const deadline = setTimeout(() => child.kill('SIGKILL'), 30_000);
      try {
        if ((await child.exited) !== 0) throw new Error(`Chromium could not print ${doc.filename}`);
      } finally {
        clearTimeout(deadline);
      }
      pdfs.push(await readFile(pdf));
    }
    return pdfs;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
