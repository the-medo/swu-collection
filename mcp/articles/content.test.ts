import { expect, test } from 'bun:test';
import { z } from 'zod';
import {
  articleDocument,
  articleFields,
  editBlocks,
  normalizeBody,
  readableArticle,
} from './content.ts';
import { postDocumentSchemas } from '../../shared/posts/content.ts';
import { insertionSchema } from '../../shared/posts/widgets.ts';

const paragraph = (id: string, text: string) => ({
  id,
  type: 'paragraph',
  content: [{ type: 'text', text }],
});
test('metadata patches preserve every omitted field, body and widget', () => {
  const original = articleDocument({
    title: 'Title',
    summary: 'Summary',
    coverUrl: 'https://example.com/cover.png',
    language: 'fr',
    season: 'Season',
    series: 'Series',
    seriesOrder: 3,
    sponsorship: 'Disclosure',
    pinned: true,
    body: {
      version: 1,
      blocks: [
        {
          type: 'swuBlock',
          widget: { kind: 'callout', tone: 'tip', title: 'Keep', text: 'A two-drop.' },
        },
      ],
    },
  });
  const fields = articleFields.parse({ title: 'Changed' });
  expect(fields).toEqual({ title: 'Changed' });
  expect(articleDocument(fields, original)).toEqual({ ...original, title: 'Changed' });
});
test('atomic block editing preserves nested formatting and stable identities; rejects cycles and duplicate IDs', () => {
  const body = normalizeBody({
    version: 1,
    blocks: [{ ...paragraph('a', 'A'), children: [paragraph('b', 'B')] }, paragraph('c', 'C')],
  });
  const edited = editBlocks(body, [
    { op: 'move', blockId: 'b', parentId: null, beforeId: 'c' },
    { op: 'replace', blockId: 'c', block: paragraph('ignored', 'Changed') },
  ]);
  expect(edited.blocks.map(block => block.id)).toEqual(['a', 'b', 'c']);
  expect(body.blocks[0].children[0].id).toBe('b');
  expect(
    editBlocks(body, [
      { op: 'replace', blockId: 'a', block: { content: [{ type: 'text', text: 'Retitled' }] } },
    ]).blocks[0].children,
  ).toEqual(body.blocks[0].children);
  expect(() => editBlocks(body, [{ op: 'move', blockId: 'a', parentId: 'b' }])).toThrow(
    'inside itself',
  );
  expect(() =>
    editBlocks(body, [{ op: 'insert', parentId: null, blocks: [paragraph('a', 'Duplicate')] }]),
  ).toThrow();
  expect(() =>
    editBlocks(body, [
      { op: 'remove', blockId: 'c' },
      { op: 'remove', blockId: 'missing' },
    ]),
  ).toThrow();
  expect(body.blocks).toHaveLength(2);
});
test('structured widgets and inline references round-trip through the native editor schema', () => {
  const card = { cardId: 'echo-base', variantId: '', name: 'Echo Base' };
  const notes = normalizeBody({ version: 1, blocks: [paragraph('notes', 'Keep removal.')] });
  const widgets = [
    { kind: 'card-image', card, size: 'large' },
    { kind: 'card-group', cards: [card], size: 'small', text: 'Bases' },
    { kind: 'decklist', deck: { deckId: crypto.randomUUID() } },
    { kind: 'album', albumId: crypto.randomUUID() },
    { kind: 'pool', poolId: crypto.randomUUID() },
    {
      kind: 'meta-analysis',
      scope: 'tournament',
      id: crypto.randomUUID(),
      settings: { metaInfo: 'leadersAndBase', metaPart: 'top8' },
    },
    { kind: 'matchup', title: 'Plan', leftBase: 'echo-base', notes, footer: 'Sideboard' },
    { kind: 'callout', tone: 'warning', title: 'Remember', text: 'Count resources.' },
  ];
  const body = normalizeBody({
    version: 1,
    blocks: [
      ...widgets.map(widget => ({ type: 'swuBlock', widget })),
      {
        type: 'paragraph',
        content: [
          { type: 'swuInline', widget: { kind: 'card-link', card } },
          {
            type: 'swuInline',
            widget: { kind: 'mention', user: { id: 'person', displayName: 'Person' } },
          },
        ],
      },
    ],
  });
  expect(postDocumentSchemas.rich.parse(JSON.parse(JSON.stringify(body)))).toEqual(body);
  expect(readableArticle(articleDocument({ body, title: 'Test' }))).toContain('[SWUBASE pool:');
});
test('authoring guide schemas are serializable; boundaries reject deep and unsafe input', () => {
  expect(
    JSON.stringify(
      z.toJSONSchema(postDocumentSchemas.rich, { io: 'output', unrepresentable: 'any' }),
    ).length,
  ).toBeGreaterThan(100);
  expect(
    JSON.stringify(z.toJSONSchema(insertionSchema, { io: 'input', unrepresentable: 'any' })).length,
  ).toBeGreaterThan(100);
  let nested: unknown = {};
  for (let i = 0; i < 40; i++) nested = { child: nested };
  expect(() => normalizeBody(nested)).toThrow('too complex');
  expect(() =>
    normalizeBody({
      version: 1,
      blocks: [{ type: 'image', props: { url: 'javascript:alert(1)' } }],
    }),
  ).toThrow();
});
