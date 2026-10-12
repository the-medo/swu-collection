import { expect, test } from 'bun:test';
import { emptyPostDocument } from '../../../shared/posts/content.ts';
import { discussionPreview } from './preview.ts';

test('discussion previews preserve formatted text and visible labels without link or widget metadata', () => {
  const doc = emptyPostDocument();
  const block = doc.blocks[0];
  if (block.type !== 'paragraph') throw new Error('Expected a paragraph');
  block.content = [
    { type: 'text', text: 'Hel', styles: { bold: true } },
    { type: 'text', text: 'lo ', styles: {} },
    {
      type: 'swuInline',
      props: {
        data: JSON.stringify({
          kind: 'mention',
          user: { id: 'private-id', displayName: 'Mira' },
        }),
      },
    },
    { type: 'text', text: '!\nSee ', styles: {} },
    {
      type: 'link',
      href: 'https://example.com/hidden-url',
      content: [{ type: 'text', text: 'this guide', styles: {} }],
    },
  ];
  expect(discussionPreview(doc)).toBe('Hello @Mira! See this guide');
  block.content = [{ type: 'text', text: 'a'.repeat(200), styles: {} }];
  expect(discussionPreview(doc)).toBe(`${'a'.repeat(159)}…`);
});
