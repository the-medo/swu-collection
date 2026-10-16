import { expect, test } from 'bun:test';
import { summarizeTemplateMeta, type TemplateMetaRow } from './templateMetaSummary.ts';

test('meta summary counts event entries once, ranks representation, and offers only recorded placements with lists', () => {
  const row: TemplateMetaRow = {
    id: 'a',
    name: 'A',
    leaderId: 'leader',
    baseId: 'base',
    tournamentId: 'event',
    placement: 1,
    hasDecklist: true,
  };
  const result = summarizeTemplateMeta(
    { scope: 'group', id: 'g', name: 'Group' },
    [{ id: 'event', name: 'Event', date: '2026-10-10', attendance: 40, imported: true }],
    [
      row,
      row,
      { ...row, tournamentId: 'second-event' },
      { ...row, id: 'b', leaderId: 'another', hasDecklist: false },
      { ...row, id: 'c', leaderId: null },
      { ...row, id: 'd', placement: 0 },
      { ...row, id: 'e', placement: null },
    ],
    '2026-10-15',
  );
  expect(result.deckCount).toBe(6);
  expect(result.archetypes).toEqual([
    { key: 'leader|base', leaderId: 'leader', baseId: 'base', count: 4 },
    { key: 'another|base', leaderId: 'another', baseId: 'base', count: 1 },
  ]);
  expect(result.decklists.map(d => `${d.tournamentId}:${d.id}`)).toEqual([
    'event:a',
    'event:c',
    'second-event:a',
  ]);
  expect(result.decklists[0]!.tournamentName).toBe('Event');
  expect(result.decklists[0]).not.toHaveProperty('hasDecklist');
});
