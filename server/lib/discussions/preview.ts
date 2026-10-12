import {
  toSimplePostDocument,
  type PostBlock,
  type PostDocument,
} from '../../../shared/posts/content.ts';

/** Plain text only: preserve visible labels without exposing link URLs or widget metadata. */
export function discussionPreview(document: PostDocument): string {
  const inlineText = (items: { type: string; text?: string; content?: { text: string }[] }[]) =>
    items.map(item => item.text ?? item.content?.map(part => part.text).join('') ?? '').join('');
  const blockText = (block: PostBlock): string => {
    let text = '';
    if ('content' in block) {
      text = Array.isArray(block.content)
        ? inlineText(block.content)
        : block.content.rows
            .map(row =>
              row.cells
                .map(cell => inlineText(Array.isArray(cell) ? cell : cell.content))
                .join(' '),
            )
            .join(' ');
    } else if ('caption' in block.props) {
      text = block.props.caption ?? '';
    }
    return [text, ...block.children.map(blockText)].join(' ');
  };
  const text = toSimplePostDocument(document)
    .blocks.map(blockText)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > 160 ? `${text.slice(0, 159).trimEnd()}…` : text;
}
