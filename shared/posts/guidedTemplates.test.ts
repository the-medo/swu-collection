import { expect, test } from 'bun:test';
import {
  createDeckGuide,
  createLimitedGuide,
  createMetaReport,
  finishGuidedTemplate,
  templateCardGroups,
} from './guidedTemplates.ts';
import { postDocumentSchemas, type PostBlock } from './content.ts';
import type { TemplateCard, TemplateDeck, TemplateMeta } from '../types/ArticleTemplates.ts';

const card = (id: string, cost: number, type = 'Unit', rarity = 'Common'): TemplateCard => ({
  cardId: id,
  variantId: 'sor_001',
  name: `Card ${id}`,
  type,
  cost,
  rarity,
});
const cards = [
  card('two', 2),
  card('three', 3),
  card('four', 4),
  card('five', 5),
  card('seven', 7),
  card('event', 2, 'Event'),
  card('upgrade', 4, 'Upgrade'),
  card('one', 1),
  card('side', 2),
  card('maybe', 3),
  card('zero-quantity', 2),
];
const deck: TemplateDeck = {
  deckId: '11111111-1111-4111-8111-111111111111',
  name: 'Test deck',
  format: 1,
  leaderIds: ['my-leader'],
  baseId: 'my-base',
  cards: cards
    .map(c => ({
      cardId: c.cardId,
      quantity: c.cardId === 'zero-quantity' ? 0 : 3,
      board: c.cardId === 'side' ? 2 : c.cardId === 'maybe' ? 3 : 1,
    }))
    .concat([{ cardId: 'two', quantity: 1, board: 1 }]),
};
const eventId = '22222222-2222-4222-8222-222222222222';
const meta: TemplateMeta = {
  source: { scope: 'current', id: '9', name: 'Current season' },
  asOf: '2026-10-15',
  events: [{ id: eventId, name: 'Qualifier', date: '2026-10-10', attendance: 64, imported: true }],
  deckCount: 42,
  archetypes: Array.from({ length: 6 }, (_, i) => ({
    key: `leader-${i}|base-${i}`,
    leaderId: `leader-${i}`,
    baseId: `base-${i}`,
    count: 12 - i * 2,
  })),
  decklists: [
    {
      id: deck.deckId,
      name: deck.name,
      leaderId: 'my-leader',
      baseId: 'my-base',
      tournamentId: eventId,
      tournamentName: 'Qualifier',
      placement: 2,
    },
  ],
};
const flatten = (blocks: PostBlock[]): PostBlock[] =>
  blocks.flatMap(block => [block, ...flatten(block.children ?? [])]);
const insertion = (block: PostBlock) => JSON.parse(String(block.props.data));
const plain = (block: PostBlock) => JSON.stringify(block.content);
test('deck guide groups only positive main-deck cards and gives each unique card its own editable paragraph', () => {
  const guide = createDeckGuide(deck, cards, meta);
  const start = guide.sections.findIndex(section => section.id === 'game-plan');
  expect(guide.sections.slice(start + 1, start + 6).map(section => section.title)).toEqual([
    '2 drops',
    '3 drops',
    '4 drops',
    '5+ drops',
    'Events and upgrades',
  ]);
  for (const [id, expected] of Object.entries({
    'drops-2': ['two'],
    'drops-3': ['three'],
    'drops-4': ['four'],
    'drops-5': ['five', 'seven'],
    'events-upgrades': ['event', 'upgrade'],
    'other-cards': ['one'],
    sideboard: ['side'],
  })) {
    const blocks = guide.sections.find(section => section.id === id)!.blocks[0]!.children!;
    expect(insertion(blocks[0]!).cards.map((c: TemplateCard) => c.cardId)).toEqual(expected);
    expect(blocks.slice(1).map(block => block.type)).toEqual(expected.map(() => 'paragraph'));
    expect(blocks.slice(1).map(block => block.content)).toEqual(
      expected.map(id => [
        { type: 'text', text: `Card ${id}`, styles: { bold: true } },
        { type: 'text', text: ' — ', styles: {} },
      ]),
    );
  }
  expect(JSON.stringify(guide)).not.toContain('zero-quantity');
  expect(JSON.stringify(guide)).not.toContain('Card maybe');
  const prepared = finishGuidedTemplate(
    guide,
    guide.sections.map(s => s.id),
  );
  expect(postDocumentSchemas.rich.safeParse(prepared.body).success).toBe(true);
  const blocks = flatten(prepared.body.blocks);
  expect(new Set(blocks.map(b => b.id)).size).toBe(blocks.length);
  expect(blocks.filter(b => b.props.isToggleable).every(b => b.props.defaultOpen === true)).toBe(
    true,
  );
});
test('only five current-meta matchups are prepared, with both decks and an editable sideboard plan', () => {
  const guide = createDeckGuide(deck, cards, meta);
  const matchups = flatten(guide.sections.find(s => s.id === 'matchups')!.blocks)
    .filter(b => b.type === 'swuBlock')
    .map(insertion);
  expect(matchups).toHaveLength(5);
  matchups.forEach((matchup, i) => {
    expect(matchup).toMatchObject({
      kind: 'matchup',
      leftLeader: 'my-leader',
      leftBase: 'my-base',
      rightLeader: `leader-${i}`,
      rightBase: `base-${i}`,
    });
    expect(matchup.notes.blocks.slice(-3).map((b: PostBlock) => b.content[0].text)).toEqual([
      'Sideboard plan:',
      'IN: ',
      'OUT: ',
    ]);
    expect(matchup.footer).toContain('available field');
  });
  expect(
    createDeckGuide(deck, cards)
      .sections.find(s => s.id === 'matchups')!
      .blocks[0]!.children!.map(plain)
      .join(),
  ).toContain('unavailable');
});
test('section selection is respected and large card groups stay within the widget limit', () => {
  const guide = createDeckGuide(deck, cards, meta);
  const prepared = finishGuidedTemplate(guide, ['game-plan', 'drops-2']);
  expect(
    flatten(prepared.body.blocks)
      .filter(b => b.type === 'heading')
      .map(b => b.content[0].text),
  ).toEqual(['Game plan', '2 drops']);
  expect(() => finishGuidedTemplate(guide, [])).toThrow();
  expect(
    templateCardGroups(Array.from({ length: 65 }, (_, i) => card(`card-${i}`, 2))).map(
      b => insertion(b).cards.length,
    ),
  ).toEqual([30, 30, 5]);
});
test('two-leader guides leave space for matchups instead of silently dropping a leader', () => {
  const guide = createDeckGuide(
    { ...deck, leaderIds: ['first-leader', 'second-leader'] },
    cards,
    meta,
  );
  const blocks = flatten(guide.sections.find(section => section.id === 'matchups')!.blocks);
  expect(blocks.filter(block => block.type === 'swuBlock')).toHaveLength(0);
  expect(JSON.stringify(blocks)).toContain('two-leader deck');
});
test('meta report keeps event placements separate and only inserts selected decklists and archetypes', () => {
  const input: TemplateMeta = {
    ...meta,
    source: { scope: 'group', id: eventId, name: 'Weekend' },
    decklists: [
      ...meta.decklists,
      {
        ...meta.decklists[0]!,
        tournamentId: deck.deckId,
        tournamentName: 'Another event',
        placement: 1,
      },
    ],
  };
  const guide = createMetaReport(
    input,
    cards,
    [meta.archetypes[1]!.key],
    [`${eventId}:${deck.deckId}`],
  );
  const prepared = finishGuidedTemplate(
    guide,
    guide.sections.map(s => s.id),
  );
  const widgets = flatten(prepared.body.blocks)
    .filter(b => b.type === 'swuBlock')
    .map(insertion);
  expect(widgets.filter(w => w.kind === 'decklist')).toHaveLength(1);
  expect(widgets.find(w => w.kind === 'meta-analysis')).toMatchObject({
    scope: 'group',
    id: eventId,
  });
  expect(JSON.stringify(prepared.body)).toContain('#2 · Qualifier');
  expect(JSON.stringify(prepared.body)).not.toContain('#1 · Another event');
  expect(JSON.stringify(prepared.body)).toContain('leader-1 / base-1');
  expect(JSON.stringify(prepared.body)).not.toContain('leader-0 / base-0');
  expect(prepared.references).toContainEqual({ type: 'deck', id: deck.deckId, startSeconds: null });
});
test('limited guides use selected leaders/cards and format-specific writing prompts', () => {
  const input = {
    set: 'sor',
    setName: 'Spark of Rebellion',
    cards: [...cards, card('rare', 6, 'Unit', 'Rare'), card('leader', 4, 'Leader')],
    leaderIds: ['leader'],
    keyCardIds: ['two', 'rare'],
    exampleDeck: deck,
  };
  for (const format of ['Draft', 'Sealed'] as const) {
    const guide = createLimitedGuide({ ...input, format });
    const prepared = finishGuidedTemplate(
      guide,
      guide.sections.map(s => s.id),
    );
    expect(prepared.title).toContain(format.toLowerCase());
    expect(JSON.stringify(prepared.body)).toContain(
      format === 'Draft' ? 'reading signals' : 'available removal',
    );
    expect(JSON.stringify(prepared.body)).not.toContain('Card three');
    expect(
      insertion(guide.sections.find(s => s.id === 'commons')!.blocks[0]!.children![0]!).cards[0]
        .cardId,
    ).toBe('two');
    expect(
      insertion(guide.sections.find(s => s.id === 'rares')!.blocks[0]!.children![0]!).cards[0]
        .cardId,
    ).toBe('rare');
  }
});
