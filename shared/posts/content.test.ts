import { describe, expect, test } from 'bun:test';
import {
  emptyPostDocument,
  isPostEmpty,
  postDocumentSchema,
  postDocumentSchemas,
  postValidationMessage,
  toSimplePostDocument,
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
