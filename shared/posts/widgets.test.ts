import { expect, test } from 'bun:test';
import {
  emptyPostDocument,
  postDocumentSchema,
  postDocumentSchemas,
  postPlainText,
  toSimplePostDocument,
  type PostDocument,
} from './content.ts';
import {
  albumHref,
  insertionHref,
  insertionLabel,
  insertionSchema,
  poolHref,
  widgetSchema,
} from './widgets.ts';

const albumId = '11111111-1111-4111-8111-111111111111';
const albumDocument = (data: unknown) => ({
  version: 1,
  blocks: [{ id: 'album', type: 'swuBlock', props: { data: JSON.stringify(data) }, children: [] }],
});

test('sealed pools persist only a reference and retain a link in text fallbacks', () => {
  const value = { kind: 'pool', poolId: albumId };
  const document = postDocumentSchemas.rich.parse(
    albumDocument({ ...value, name: 'Private title', leaders: ['private-leader'] }),
  );
  const block = document.blocks[0];
  if (block.type !== 'swuBlock') throw new Error('Expected pool widget');
  expect(JSON.parse(block.props.data)).toEqual(value);
  expect(postDocumentSchemas.rich.parse(document)).toEqual(document);
  const href = `/limited/pool/${albumId}/detail`;
  expect(insertionHref(insertionSchema.parse(value))).toBe(href);
  expect(postPlainText(document)).toBe(`SWUBASE sealed pool: ${href}`);
  const simple = toSimplePostDocument(document).blocks[0];
  if (simple.type !== 'paragraph') throw new Error('Expected fallback paragraph');
  expect(simple.content).toEqual([
    {
      type: 'link',
      href,
      content: [{ type: 'text', text: `SWUBASE sealed pool: ${href}`, styles: {} }],
    },
  ]);
  expect(poolHref('a/b?c')).toBe('/limited/pool/a%2Fb%3Fc/detail');
});

test('sealed pool references reject malformed IDs and stay exclusive to rich block widgets', () => {
  for (const poolId of ['', 'https://example.invalid/pool', '../settings', null, 42])
    expect(
      postDocumentSchemas.rich.safeParse(albumDocument({ kind: 'pool', poolId })).success,
    ).toBe(false);
  const value = { kind: 'pool', poolId: albumId };
  const document = albumDocument(value);
  expect(postDocumentSchemas.comments.safeParse(document).success).toBe(false);
  expect(postDocumentSchemas.simple.safeParse(document).success).toBe(false);
  expect(
    postDocumentSchemas.rich.safeParse({
      version: 1,
      blocks: [
        {
          id: 'paragraph',
          type: 'paragraph',
          props: {},
          children: [],
          content: [{ type: 'swuInline', props: { data: JSON.stringify(value) } }],
        },
      ],
    }).success,
  ).toBe(false);
});

test('albums persist references without copying private metadata or photos into articles', () => {
  const value = { kind: 'album', albumId };
  const document = postDocumentSchemas.rich.parse(
    albumDocument({
      ...value,
      title: 'Private title',
      images: [{ url: 'https://example.invalid/private-photo.jpg' }],
    }),
  );
  const block = document.blocks[0];
  if (block.type !== 'swuBlock') throw new Error('Expected album widget');
  expect(JSON.parse(block.props.data)).toEqual(value);
  expect(postDocumentSchemas.rich.parse(document)).toEqual(document);
  expect(insertionHref(insertionSchema.parse(value))).toBe(`/albums/${albumId}`);
  expect(postPlainText(document)).toBe(`SWUBASE album: /albums/${albumId}`);
  const simple = toSimplePostDocument(document).blocks[0];
  if (simple.type !== 'paragraph') throw new Error('Expected fallback paragraph');
  expect(simple.content).toEqual([
    {
      type: 'link',
      href: `/albums/${albumId}`,
      content: [{ type: 'text', text: `SWUBASE album: /albums/${albumId}`, styles: {} }],
    },
  ]);
});

test('album references reject malformed IDs and cannot be placed inline or in comments', () => {
  for (const invalid of ['', 'https://example.invalid/album', '../settings', null, 42]) {
    expect(
      postDocumentSchemas.rich.safeParse(albumDocument({ kind: 'album', albumId: invalid }))
        .success,
    ).toBe(false);
  }
  const document = albumDocument({ kind: 'album', albumId });
  expect(postDocumentSchemas.comments.safeParse(document).success).toBe(false);
  expect(postDocumentSchemas.simple.safeParse(document).success).toBe(false);
  expect(
    postDocumentSchemas.rich.safeParse({
      version: 1,
      blocks: [
        {
          id: 'paragraph',
          type: 'paragraph',
          props: {},
          children: [],
          content: [
            { type: 'swuInline', props: { data: JSON.stringify({ kind: 'album', albumId }) } },
          ],
        },
      ],
    }).success,
  ).toBe(false);
  expect(albumHref('a/b?c')).toBe('/albums/a%2Fb%3Fc');
});

const notes = (text: string): PostDocument => ({
  version: 1,
  blocks: [
    {
      id: 'notes',
      type: 'paragraph',
      props: {},
      children: [],
      content: [{ type: 'text', text, styles: {} }],
    },
  ],
});

test('matchups persist any combination of optional leaders and bases, plus footer text', () => {
  for (let mask = 0; mask < 16; mask++) {
    const cards = Object.fromEntries(
      ['leftLeader', 'leftBase', 'rightLeader', 'rightBase']
        .filter((_, bit) => mask & (1 << bit))
        .map(field => [field, `card-${field}`]),
    );
    const value = {
      kind: 'matchup',
      title: 'Game plan',
      subtitle: 'On the play',
      notes: notes('Trade efficiently.'),
      footer: 'Testing notes\nUpdated after round 3.',
      ...cards,
    };
    const document = postDocumentSchema.parse({
      version: 1,
      blocks: [
        { id: 'matchup', type: 'swuBlock', props: { data: JSON.stringify(value) }, children: [] },
      ],
    });
    const block = document.blocks[0];
    if (block.type !== 'swuBlock') throw new Error('Expected matchup widget');
    expect(JSON.parse(block.props.data)).toEqual(value);
    const simple = toSimplePostDocument(document).blocks[0];
    if (simple.type !== 'paragraph') throw new Error('Expected text fallback');
    const prose = simple.content.map(item => (item.type === 'text' ? item.text : '')).join('');
    expect(prose).toContain(value.footer);
    expect(prose).not.toContain('undefined');
    for (const card of Object.values(cards)) expect(prose).toContain(card);
  }
});

test('omitted cards are allowed but supplied card references and footer still validate', () => {
  const value = { kind: 'matchup', notes: notes('Trade efficiently.') };
  expect(insertionLabel(widgetSchema.parse(value))).toBe('Matchup plan\nTrade efficiently.');
  for (const field of ['leftLeader', 'leftBase', 'rightLeader', 'rightBase']) {
    for (const invalid of ['', 'constructor', '__proto__', null, 42])
      expect(widgetSchema.safeParse({ ...value, [field]: invalid }).success).toBe(false);
  }
  expect(widgetSchema.safeParse({ ...value, footer: 'a'.repeat(1000) }).success).toBe(true);
  expect(widgetSchema.safeParse({ ...value, footer: 'a'.repeat(1001) }).success).toBe(false);
  expect(widgetSchema.safeParse({ ...value, notes: emptyPostDocument() }).success).toBe(false);
  expect(widgetSchema.safeParse({ ...value, notes: notes('  ') }).success).toBe(true);
  expect(widgetSchema.safeParse({ ...value, notes: notes('a'.repeat(5000)) }).success).toBe(true);
  expect(widgetSchema.safeParse({ ...value, notes: notes('a'.repeat(5001)) }).success).toBe(false);
});

test('existing plain-text matchup notes become editable paragraphs on read and save', () => {
  const legacy = { kind: 'matchup', text: 'Keep pressure.\nTrade efficiently.' };
  const parsed = widgetSchema.parse(legacy);
  expect(insertionLabel(parsed)).toBe('Matchup plan\nKeep pressure.\nTrade efficiently.');
  expect(parsed).not.toHaveProperty('text');
  expect(widgetSchema.parse(parsed)).toEqual(parsed);
  expect(widgetSchema.safeParse({ kind: 'matchup', text: '   ' }).success).toBe(true);
  const document = postDocumentSchema.parse({
    version: 1,
    blocks: [
      {
        id: 'matchup',
        type: 'swuBlock',
        props: { data: JSON.stringify(legacy) },
        children: [],
      },
    ],
  });
  const block = document.blocks[0];
  if (block.type !== 'swuBlock') throw new Error('Expected matchup');
  expect(JSON.parse(block.props.data)).toEqual(parsed);
  // A malformed supplied document must not fall back to the old field.
  expect(widgetSchema.safeParse({ ...legacy, notes: null }).success).toBe(false);
});

test('matchup notes preserve comment formatting and inline references but reject rich widgets and unsafe links', () => {
  const content: PostDocument = {
    version: 1,
    blocks: [
      {
        id: 'notes',
        type: 'paragraph',
        props: {},
        children: [],
        content: [
          { type: 'text', text: 'Prioritize ', styles: { bold: true } },
          {
            type: 'swuInline',
            props: {
              data: JSON.stringify({
                kind: 'card-link',
                card: { cardId: 'battlefield-marine', variantId: '', name: 'Battlefield Marine' },
              }),
            },
          },
          { type: 'text', text: ' with ', styles: {} },
          {
            type: 'swuInline',
            props: {
              data: JSON.stringify({
                kind: 'mention',
                user: { id: 'player', displayName: 'Leia' },
              }),
            },
          },
        ],
      },
    ],
  };
  const value = { kind: 'matchup', notes: content };
  const parsed = widgetSchema.parse(value);
  expect(insertionLabel(parsed)).toBe('Matchup plan\nPrioritize Battlefield Marine with @Leia');
  if (parsed.kind !== 'matchup') throw new Error('Expected matchup');
  expect(parsed.notes).toEqual(content);
  for (const block of [
    {
      id: 'bad',
      type: 'heading',
      props: { level: 1 },
      content: [{ type: 'text', text: 'Heading', styles: {} }],
      children: [],
    },
    {
      id: 'bad',
      type: 'swuBlock',
      props: {
        data: JSON.stringify({ kind: 'callout', title: 'Title', text: 'Text', tone: 'tip' }),
      },
      children: [],
    },
    { id: 'bad', type: 'swuBlock', props: { data: JSON.stringify(value) }, children: [] },
    {
      id: 'bad',
      type: 'paragraph',
      props: {},
      content: [
        {
          type: 'link',
          href: 'javascript:alert(1)',
          content: [{ type: 'text', text: 'Link', styles: {} }],
        },
      ],
      children: [],
    },
  ]) {
    expect(
      widgetSchema.safeParse({ ...value, notes: { version: 1, blocks: [block] } }).success,
    ).toBe(false);
  }
});
