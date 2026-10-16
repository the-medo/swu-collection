import { HTTPException } from 'hono/http-exception';
import type { PostDocument, PostBlock } from '../../../shared/posts/content.ts';
import type { Insertion } from '../../../shared/posts/widgets.ts';
import { containsProfanity, profanityMessage } from './profanity.ts';

export class ProfanityError extends HTTPException {
  constructor(field: string, label: string) {
    const message = profanityMessage(label);
    super(400, {
      message,
      res: Response.json({ code: 'PROFANITY_NOT_ALLOWED', field, message }, { status: 400 }),
    });
  }
}

export function assertTextAllowed(text: string | null | undefined, field: string, label: string) {
  if (text != null && containsProfanity(text)) throw new ProfanityError(field, label);
}

export function assertDeckTextAllowed(input: { name?: string; description?: string | null }) {
  assertNamedTextAllowed(input, 'Deck');
}

export function assertNamedTextAllowed(
  input: { name?: string | null; description?: string | null },
  label: string,
) {
  assertTextAllowed(input.name, 'name', `${label} name`);
  assertTextAllowed(input.description ?? undefined, 'description', `${label} description`);
}

export function assertCollectionTextAllowed(input: {
  title?: string;
  description?: string | null;
}) {
  assertTextAllowed(input.title, 'title', 'List title');
  assertTextAllowed(input.description ?? undefined, 'description', 'List description');
}

type Inline = Extract<
  PostBlock,
  { type: 'paragraph' | 'bulletListItem' | 'quote' | 'toggleListItem' }
>['content'];

// Input has already passed the PostDocument schema. Adjacent formatting runs
// and link labels form one visible string. Check widget labels as well: some
// editors accept these from the client. URLs and IDs are not prose. Keep
// paragraphs and table cells separate.
function inlineText(items: Inline): string {
  return items
    .map(item => {
      if (item.type === 'text') return item.text;
      if (item.type === 'link') return item.content.map(part => part.text).join('');
      const insertion = JSON.parse(item.props.data) as Insertion;
      if (insertion.kind === 'card-link') return insertion.card.name;
      if (insertion.kind === 'mention') return `@${insertion.user.displayName}`;
      return ' ';
    })
    .join('');
}

export function assertPostAllowed(document: PostDocument, label: string) {
  const check = (text: string | undefined) => assertTextAllowed(text, 'content', label);
  const visit = (blocks: PostBlock[]) => {
    for (const block of blocks) {
      if (block.type === 'table') {
        for (const row of block.content.rows)
          for (const cell of row.cells)
            check(inlineText(Array.isArray(cell) ? cell : cell.content));
      } else if (block.type === 'swuBlock') {
        const widget = JSON.parse(block.props.data) as Insertion;
        if (widget.kind === 'callout' || widget.kind === 'matchup') check(widget.title);
        if (widget.kind === 'matchup') {
          check(widget.subtitle);
          check(widget.footer);
          visit(widget.notes.blocks);
        }
        if (widget.kind === 'callout' || widget.kind === 'card-group') check(widget.text);
        if (widget.kind === 'card-image') check(widget.card.name);
        if (widget.kind === 'card-group') for (const card of widget.cards) check(card.name);
      } else if ('content' in block) {
        check(inlineText(block.content));
      } else if (
        block.type === 'image' ||
        block.type === 'audio' ||
        block.type === 'video' ||
        block.type === 'file'
      ) {
        check(block.props.name);
        check(block.props.caption);
      }
      visit(block.children);
    }
  };
  visit(document.blocks);
}
