import { expect, test } from 'bun:test';
import { parseHTML } from 'linkedom';
import { renderToStaticMarkup } from 'react-dom/server';
import { cardList } from '../../../../../../../server/db/lists.ts';
import { SidebarProvider } from '@/components/ui/sidebar.tsx';
import CPHomeworldBaseTable from './CPHomeworldBaseTable.tsx';

const renderBases = (savedBaseId: string, selectedBaseId: string) =>
  parseHTML(
    renderToStaticMarkup(
      <SidebarProvider>
        <CPHomeworldBaseTable
          cards={cardList}
          savedBaseId={savedBaseId}
          selectedBaseId={selectedBaseId}
          onSelect={() => {}}
          onHover={() => {}}
          showPreview={false}
        />
      </SidebarProvider>,
    ),
  ).document;

test('keeps the saved base visible when a different base is selected', () => {
  const document = renderBases('theed-palace', 'origin-tree');
  const saved = document.querySelector('button[aria-label^="Theed Palace"]')!;
  const pending = document.querySelector('button[aria-label^="Origin Tree"]')!;

  expect(saved.textContent).toContain('Saved');
  expect(saved.getAttribute('aria-label')).toContain('(saved)');
  expect(saved.getAttribute('aria-pressed')).toBe('false');
  expect(pending.getAttribute('aria-pressed')).toBe('true');
  expect(pending.textContent).not.toContain('Saved');
  expect(document.querySelectorAll('button[aria-pressed="true"]').length).toBe(1);
});

test('offers all aspect/trait choices and uses the HMW printing of reprinted bases', () => {
  const document = renderBases('mos-eisley', 'mos-eisley');
  expect(document.querySelectorAll('tbody button').length).toBe(16);
  expect(Array.from(document.querySelectorAll('thead th')).map(n => n.textContent)).toEqual([
    'Aspect',
    'Tatooine',
    'Naboo',
    'Kashyyyk',
    'Endor',
  ]);
  expect(Array.from(document.querySelectorAll('tbody th')).map(n => n.textContent)).toEqual([
    'Vigilance',
    'Command',
    'Aggression',
    'Cunning',
  ]);
  const base = document.querySelector('button[aria-label^="Mos Eisley"]')!;
  expect(base.getAttribute('aria-pressed')).toBe('true');
  expect(base.querySelector('img')?.getAttribute('src')).toContain('homeworlds');
});
