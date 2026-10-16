import { expect, test } from 'bun:test';
import { postDocumentSchema, type PostDocument } from '../../../shared/posts/content.ts';
import { assertNamedTextAllowed, assertPostAllowed, ProfanityError } from './content.ts';

const text = (value: string) => ({ type: 'text', text: value, styles: {} });
const document = (block: object): PostDocument =>
  postDocumentSchema.parse({
    version: 1,
    blocks: [{ id: 'fixture', children: [], props: {}, ...block }],
  });

test('joins formatting fragments and link labels without allowing formatting bypasses', () => {
  const content = document({
    type: 'paragraph',
    content: [
      text('fu'),
      {
        type: 'link',
        href: 'https://example.com',
        content: [{ ...text('ck'), styles: { bold: true } }],
      },
    ],
  });
  const original = structuredClone(content);
  expect(() => assertPostAllowed(content, 'Comment')).toThrow(ProfanityError);
  expect(content).toEqual(original);
});

test('checks nested blocks, both table cell formats and code blocks', () => {
  const cases = [
    {
      type: 'paragraph',
      content: [],
      children: [
        { id: 'child', type: 'paragraph', props: {}, content: [text('fuck')], children: [] },
      ],
    },
    {
      type: 'table',
      content: {
        type: 'tableContent',
        columnWidths: [null],
        rows: [{ cells: [[text('fu'), text('ck')]] }],
      },
    },
    {
      type: 'table',
      content: {
        type: 'tableContent',
        columnWidths: [null],
        rows: [{ cells: [{ type: 'tableCell', props: {}, content: [text('fuck')] }] }],
      },
    },
    { type: 'codeBlock', props: { language: 'text' }, content: [text('fuck')] },
  ];
  for (const block of cases)
    expect(() => assertPostAllowed(document(block), 'Bio')).toThrow(ProfanityError);
});

test('checks media captions and file names without checking URLs', () => {
  for (const type of ['image', 'audio', 'video', 'file']) {
    const props = { url: 'https://example.com/fuck.png', name: 'A game', caption: 'A good game' };
    expect(() => assertPostAllowed(document({ type, props }), 'Bio')).not.toThrow();
    for (const field of ['name', 'caption']) {
      expect(() =>
        assertPostAllowed(document({ type, props: { ...props, [field]: 'fuck' } }), 'Bio'),
      ).toThrow(ProfanityError);
    }
  }
});

test('checks visible widget text and client-supplied card/mention labels', () => {
  const card = { cardId: 'fixture', variantId: '', name: 'fuck' };
  for (const insertion of [
    { kind: 'callout', tone: 'tip', title: 'fuck', text: 'Play units.' },
    {
      kind: 'matchup',
      notes: document({ type: 'paragraph', content: [text('Play units.')] }),
      footer: 'fuck',
    },
    {
      kind: 'matchup',
      title: 'Matchup',
      subtitle: 'fuck',
      leftLeader: 'a',
      rightLeader: 'b',
      notes: document({ type: 'paragraph', content: [text('Play units.')] }),
    },
    { kind: 'card-group', cards: [{ ...card, name: 'Assassin' }], size: 'small', text: 'fuck' },
    { kind: 'card-image', card, size: 'small' },
  ])
    expect(() =>
      assertPostAllowed(
        document({ type: 'swuBlock', props: { data: JSON.stringify(insertion) } }),
        'Deck guide',
      ),
    ).toThrow(ProfanityError);
  for (const insertion of [
    { kind: 'card-link', card },
    { kind: 'mention', user: { id: 'a', displayName: 'fuck' } },
  ])
    expect(() =>
      assertPostAllowed(
        document({
          type: 'paragraph',
          content: [{ type: 'swuInline', props: { data: JSON.stringify(insertion) } }],
        }),
        'Comment',
      ),
    ).toThrow(ProfanityError);
});

test('checks formatted matchup notes and their card links and mentions', () => {
  for (const content of [
    [text('fu'), { ...text('ck'), styles: { bold: true } }],
    [
      {
        type: 'swuInline',
        props: {
          data: JSON.stringify({
            kind: 'card-link',
            card: { cardId: 'fixture', variantId: '', name: 'fuck' },
          }),
        },
      },
    ],
    [
      {
        type: 'swuInline',
        props: {
          data: JSON.stringify({ kind: 'mention', user: { id: 'player', displayName: 'fuck' } }),
        },
      },
    ],
  ]) {
    const matchup = { kind: 'matchup', notes: document({ type: 'paragraph', content }) };
    expect(() =>
      assertPostAllowed(
        document({ type: 'swuBlock', props: { data: JSON.stringify(matchup) } }),
        'Article',
      ),
    ).toThrow(ProfanityError);
  }
});

test('does not scan IDs, styles or hidden URLs, or merge separate paragraphs', () => {
  const content = document({
    id: 'fuck',
    type: 'paragraph',
    props: { textColor: 'shit' },
    content: [
      { type: 'link', href: 'https://example.com/fuck', content: [text('Assassin strategy')] },
    ],
  });
  expect(() => assertPostAllowed(content, 'Comment')).not.toThrow();
  const split = postDocumentSchema.parse({
    version: 1,
    blocks: [
      { id: 'a', type: 'paragraph', props: {}, children: [], content: [text('fu')] },
      { id: 'b', type: 'paragraph', props: {}, children: [], content: [text('ck')] },
    ],
  });
  expect(() => assertPostAllowed(split, 'Comment')).not.toThrow();
});

test('errors identify the field without returning the submitted text', async () => {
  const error = new ProfanityError('name', 'Deck name');
  expect(error.status).toBe(400);
  expect(await error.getResponse().json()).toEqual({
    code: 'PROFANITY_NOT_ALLOWED',
    field: 'name',
    message: "Deck name contains language we don't allow. Please reword it.",
  });
});

test('legacy nullable names and descriptions do not prevent sharing', () => {
  expect(() =>
    assertNamedTextAllowed({ name: null, description: null }, 'Card pool'),
  ).not.toThrow();
});
