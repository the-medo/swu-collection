import { describe, expect, test } from 'bun:test';
import {
  emptyPostDocument,
  isPostEmpty,
  postDocumentSchema,
  postDocumentSchemas,
  postValidationMessage,
  toSimplePostDocument,
  trimTrailingEmptyBlocks,
} from './content.ts';

const paragraph = (content: unknown[] = []) => ({
  id: crypto.randomUUID(),
  type: 'paragraph',
  props: {},
  content,
  children: [],
});
const text = (value = 'Hello') => ({ type: 'text', text: value, styles: { bold: true } });
const document = (blocks: unknown[]) => ({ version: 1, blocks });

describe('persisted post content', () => {
  test('all editor modes trim trailing blanks while retaining interior spacing and meaningful nested content', () => {
    const source = postDocumentSchema.parse(
      document([
        paragraph([text('First paragraph')]),
        paragraph(),
        {
          ...paragraph([text('Last paragraph')]),
          children: [paragraph([text('Nested text')]), paragraph([text('  ')])],
        },
        paragraph([{ type: 'link', href: 'https://swubase.com', content: [text(' ')] }]),
        { ...paragraph(), type: 'heading', props: { level: 4 } },
        paragraph([text('\n ')]),
      ]),
    );
    const original = structuredClone(source);
    const result = trimTrailingEmptyBlocks(source);
    expect(result.blocks).toHaveLength(3);
    expect(result.blocks[1]).toEqual(source.blocks[1]);
    expect(result.blocks[2].children).toHaveLength(1);
    expect(source).toEqual(original);
    expect(trimTrailingEmptyBlocks(result)).toBe(result);
    for (const schema of Object.values(postDocumentSchemas))
      expect(schema.safeParse(result).success).toBe(true);
  });

  test('trimming preserves tables, media, dividers, checkboxes, widgets, and user mentions', () => {
    const mention = {
      type: 'swuInline',
      props: {
        data: JSON.stringify({ kind: 'mention', user: { id: 'player', displayName: 'Player' } }),
      },
    };
    const blocks = [
      { ...paragraph(), type: 'divider', props: {}, content: undefined },
      {
        ...paragraph(),
        type: 'image',
        props: { url: 'https://swubase.com/image.png' },
        content: undefined,
      },
      {
        ...paragraph(),
        type: 'table',
        content: { type: 'tableContent', columnWidths: [null], rows: [{ cells: [[]] }] },
      },
      { ...paragraph(), type: 'checkListItem', props: { checked: true } },
      {
        ...paragraph(),
        type: 'swuBlock',
        props: {
          data: JSON.stringify({ kind: 'decklist', deck: { deckId: crypto.randomUUID() } }),
        },
        content: undefined,
      },
      paragraph([mention]),
      { ...paragraph(), children: [paragraph([text('Nested content')]), paragraph()] },
    ];
    for (const block of blocks) {
      const source = postDocumentSchema.parse(document([block, paragraph()]));
      const result = trimTrailingEmptyBlocks(source);
      expect(result.blocks).toHaveLength(1);
      expect(result.blocks[0].id).toBe(source.blocks[0].id);
      expect(isPostEmpty(result)).toBe(false);
    }
  });

  test('all-empty documents retain one valid empty paragraph for clearing a guide or bio', () => {
    const source = postDocumentSchema.parse(
      document([{ ...paragraph(), type: 'heading', props: { level: 4 } }, paragraph([text(' ')])]),
    );
    const result = trimTrailingEmptyBlocks(source);
    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0].id).toBe(source.blocks[0].id);
    expect(isPostEmpty(result)).toBe(true);
    for (const schema of Object.values(postDocumentSchemas))
      expect(schema.safeParse(result).success).toBe(true);
  });

  test('comments retain user mentions, card links and formatting in paragraphs, nested blocks and tables', () => {
    const mention = {
      type: 'swuInline',
      props: {
        data: JSON.stringify({ kind: 'mention', user: { id: 'player', displayName: 'Player' } }),
      },
    };
    const cardLink = {
      type: 'swuInline',
      props: {
        data: JSON.stringify({
          kind: 'card-link',
          card: { cardId: 'battlefield-marine', variantId: '', name: 'Battlefield Marine' },
        }),
      },
    };
    const comments = document([
      {
        ...paragraph([text(), mention, cardLink]),
        children: [paragraph([mention, cardLink])],
      },
      {
        ...paragraph(),
        type: 'table',
        content: {
          type: 'tableContent',
          columnWidths: [null, null],
          rows: [
            { cells: [[mention, cardLink], { type: 'tableCell', props: {}, content: [cardLink] }] },
          ],
        },
      },
      { ...paragraph([text()]), type: 'heading', props: { level: 4 } },
    ]);
    expect(postDocumentSchemas.comments.parse(comments)).toEqual(
      postDocumentSchema.parse(comments),
    );
    expect(postDocumentSchemas.simple.safeParse(comments).success).toBe(false);
  });

  test('comments reject H1–H3 and block widgets at every placement while rich articles allow them', () => {
    const deck = {
      id: crypto.randomUUID(),
      type: 'swuBlock',
      props: { data: JSON.stringify({ kind: 'decklist', deck: { deckId: crypto.randomUUID() } }) },
      children: [],
    };
    const image = {
      ...deck,
      props: {
        data: JSON.stringify({
          kind: 'card-image',
          card: { cardId: 'battlefield-marine', variantId: '', name: 'Battlefield Marine' },
          size: 'medium',
        }),
      },
    };
    for (const blocks of [
      ...[1, 2, 3].flatMap(level => {
        const heading = { ...paragraph([text()]), type: 'heading', props: { level } };
        return [[heading], [{ ...paragraph(), children: [heading] }]];
      }),
      [deck],
      [{ ...paragraph(), children: [deck] }],
      [image],
      [{ ...paragraph(), children: [image] }],
    ]) {
      expect(postDocumentSchemas.rich.safeParse(document(blocks)).success).toBe(true);
      expect(postDocumentSchemas.comments.safeParse(document(blocks)).success).toBe(false);
    }
  });

  test('simple content retains formatting and links while rejecting every placement of SWUBASE nodes', () => {
    const mention = {
      type: 'swuInline',
      props: {
        data: JSON.stringify({ kind: 'mention', user: { id: 'player', displayName: 'Player' } }),
      },
    };
    const deck = {
      id: crypto.randomUUID(),
      type: 'swuBlock',
      props: { data: JSON.stringify({ kind: 'decklist', deck: { deckId: crypto.randomUUID() } }) },
      children: [],
    };
    for (const blocks of [
      [deck],
      [{ ...paragraph(), children: [deck] }],
      [paragraph([mention])],
      [
        {
          ...paragraph(),
          type: 'table',
          content: {
            type: 'tableContent',
            columnWidths: [null, null],
            rows: [{ cells: [[mention], { type: 'tableCell', props: {}, content: [mention] }] }],
          },
        },
      ],
    ]) {
      const rich = postDocumentSchemas.rich.parse(document(blocks));
      expect(postDocumentSchemas.simple.safeParse(rich).success).toBe(false);
      const simple = toSimplePostDocument(rich);
      expect(postDocumentSchemas.simple.parse(simple)).toEqual(simple);
      expect(JSON.stringify(simple)).not.toContain('swuBlock');
      expect(JSON.stringify(simple)).not.toContain('swuInline');
      expect(JSON.stringify(simple)).toContain('"type":"link"');
      expect(toSimplePostDocument(simple)).toEqual(simple);
    }
    const formatted = document([
      paragraph([text(), { type: 'link', href: '/users/player', content: [text('@Player')] }]),
    ]);
    expect(postDocumentSchemas.simple.parse(formatted)).toEqual(formatted);
  });

  test('converting legacy widgets preserves notes, children, and the original document', () => {
    const rich = postDocumentSchema.parse(
      document([
        {
          id: 'callout',
          type: 'swuBlock',
          props: {
            data: JSON.stringify({
              kind: 'callout',
              tone: 'tip',
              title: 'Game plan',
              text: 'Keep early units.',
            }),
          },
          children: [paragraph([text('Nested paragraph')])],
        },
      ]),
    );
    const original = structuredClone(rich);
    const simple = toSimplePostDocument(rich);
    expect(simple.blocks[0]).toMatchObject({
      id: 'callout',
      type: 'paragraph',
      children: rich.blocks[0]!.children,
    });
    expect(JSON.stringify(simple)).toContain('Game plan: Keep early units.');
    expect(rich).toEqual(original);
  });

  test('round-trips formatting, links, nested blocks, tables, and reference widgets', () => {
    const content = document([
      { ...paragraph([text()]), type: 'heading', props: { level: 6, isToggleable: true } },
      {
        ...paragraph([text(), { type: 'link', href: 'https://swubase.com', content: [text()] }]),
        children: [paragraph()],
      },
      {
        ...paragraph(),
        type: 'table',
        content: { type: 'tableContent', columnWidths: [null], rows: [{ cells: [[text()]] }] },
      },
      {
        id: 'deck',
        type: 'swuBlock',
        props: {
          data: JSON.stringify({ kind: 'decklist', deck: { deckId: crypto.randomUUID() } }),
        },
        children: [],
      },
      paragraph([
        {
          type: 'swuInline',
          props: {
            data: JSON.stringify({
              kind: 'mention',
              user: { id: 'a-user', displayName: 'Player' },
            }),
          },
        },
      ]),
    ]);
    expect(postDocumentSchema.parse(content)).toEqual(content);
  });
  test('rejects executable links and media URLs, including disguised protocols', () => {
    for (const href of [
      'javascript:alert(1)',
      'JaVaScRiPt:alert(1)',
      'java\nscript:alert(1)',
      'data:text/html,hi',
      '//example.com',
      '/\\evil.test',
    ]) {
      expect(
        postDocumentSchema.safeParse(
          document([paragraph([{ type: 'link', href, content: [text()] }])]),
        ).success,
      ).toBe(false);
      expect(
        postDocumentSchema.safeParse(
          document([{ ...paragraph(), type: 'image', props: { url: href } }]),
        ).success,
      ).toBe(false);
    }
  });
  test('rejects unsupported versions, blocks, misplaced/invalid widgets, and duplicate IDs', () => {
    const block = paragraph();
    for (const content of [
      { version: 2, blocks: [block] },
      document([{ ...block, type: 'rawHTML', content: '<script>alert(1)</script>' }]),
      document([block, block]),
      document([{ ...block, type: 'swuBlock', props: { data: 'not JSON' } }]),
      document([
        {
          ...block,
          type: 'swuBlock',
          props: {
            data: JSON.stringify({ kind: 'mention', user: { id: 'u', displayName: 'User' } }),
          },
        },
      ]),
      document([
        paragraph([
          {
            type: 'swuInline',
            props: {
              data: JSON.stringify({ kind: 'decklist', deck: { deckId: crypto.randomUUID() } }),
            },
          },
        ]),
      ]),
    ])
      expect(postDocumentSchema.safeParse(content).success).toBe(false);
  });
  test('bounds bytes, total blocks, and nesting before recursive validation', () => {
    expect(
      postDocumentSchema.safeParse(document([paragraph([text('x'.repeat(256_000))])])).success,
    ).toBe(false);
    expect(
      postDocumentSchema.safeParse(document(Array.from({ length: 501 }, () => paragraph())))
        .success,
    ).toBe(false);
    let nested: unknown = paragraph();
    for (let i = 0; i < 100; i++) nested = { ...paragraph(), children: [nested] };
    expect(postDocumentSchema.safeParse(document([nested])).success).toBe(false);
  });
  test('only empty paragraphs count as a cleared bio', () => {
    expect(isPostEmpty(emptyPostDocument())).toBe(true);
    expect(isPostEmpty(postDocumentSchema.parse(document([paragraph([text('   ')])])))).toBe(true);
    expect(isPostEmpty(postDocumentSchema.parse(document([paragraph([text()])])))).toBe(false);
  });
  test('caps expensive chart widgets across nested blocks', () => {
    const chart = () => ({
      id: crypto.randomUUID(),
      type: 'swuBlock',
      props: {
        data: JSON.stringify({
          kind: 'meta-analysis',
          scope: 'group',
          id: crypto.randomUUID(),
          settings: {},
        }),
      },
      children: [],
    });
    expect(postDocumentSchema.safeParse(document([chart(), chart(), chart()])).success).toBe(true);
    const result = postDocumentSchema.safeParse(
      document([chart(), chart(), { ...paragraph(), children: [chart(), chart()] }]),
    );
    expect(result.success).toBe(false);
    if (!result.success)
      expect(postValidationMessage(result.error)).toContain('three meta analysis widgets');
  });
  test('rejects inherited dictionary keys before public widget rendering', () => {
    for (const key of ['constructor', '__proto__', 'toString', 'hasOwnProperty']) {
      for (const card of [
        { cardId: key, variantId: '', name: 'Invalid card' },
        { cardId: 'battlefield-marine', variantId: key, name: 'Invalid variant' },
      ]) {
        const block = {
          id: 'image',
          type: 'swuBlock',
          props: { data: JSON.stringify({ kind: 'card-image', card }) },
          children: [],
        };
        expect(postDocumentSchema.safeParse(document([block])).success).toBe(false);
      }
      const matchup = {
        kind: 'matchup',
        leftLeader: 'sabine-wren',
        rightLeader: key,
        text: 'Notes',
      };
      expect(
        postDocumentSchema.safeParse(
          document([
            {
              id: 'matchup',
              type: 'swuBlock',
              props: { data: JSON.stringify(matchup) },
              children: [],
            },
          ]),
        ).success,
      ).toBe(false);
    }
  });
});
