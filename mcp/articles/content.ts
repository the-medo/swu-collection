import { z } from 'zod';
import { creationDocumentSchema, type CreationDocument } from '../../shared/creators/contracts.ts';
import {
  emptyPostDocument,
  MAX_POST_BYTES,
  postDocumentSchemas,
  postPlainText,
  type PostBlock,
  type PostDocument,
} from '../../shared/posts/content.ts';
import { insertionSchema, insertionLabel, insertionHref } from '../../shared/posts/widgets.ts';
import { CreatorError } from '../../server/lib/creators/errors.ts';

// Transport schemas stay finite and discoverable. The existing bounded, recursive
// editor schema remains authoritative after structured widget normalization.
export const bodyInput = z
  .object({
    version: z.literal(1),
    blocks: z.array(z.record(z.string(), z.unknown())).min(1).max(500),
  })
  .describe(
    'Native PostDocument v1. Blocks may omit id/children/props. Use widget: {kind, ...settings} on swuBlock/swuInline instead of encoding props.data. See get_article_authoring_guide.',
  );
const { medium, body, videoDescription, durationSeconds, chapters, ...metadata } =
  creationDocumentSchema.shape;
// Zod applies inner defaults even through optional(). A PATCH must never reset
// omitted metadata to its create-time defaults.
type WithoutDefault<T extends z.ZodType> = T extends z.ZodDefault<infer I> ? I : T;
const patchMetadata = Object.fromEntries(
  Object.entries(metadata).map(([key, schema]) => [
    key,
    (schema instanceof z.ZodDefault ? schema.removeDefault() : schema).optional(),
  ]),
) as { [K in keyof typeof metadata]: z.ZodOptional<WithoutDefault<(typeof metadata)[K]>> };
export const articleFields = z.object({ ...patchMetadata, body: bodyInput.optional() }).strict();
export const revisionInput = {
  articleId: z.uuid(),
  expectedRevision: z.number().int().positive(),
  expectedOwnershipRevision: z.number().int().positive(),
};
export const requestIdInput = z
  .uuid()
  .describe('Unique operation UUID. Reuse it with identical input when retrying this write.');

function bounded(value: unknown) {
  const stack = [{ value, depth: 0 }];
  let count = 0;
  while (stack.length) {
    const next = stack.pop()!;
    if (++count > 30_000 || next.depth > 32)
      throw new CreatorError('Article content is too complex.');
    if (next.value && typeof next.value === 'object')
      for (const child of Object.values(next.value))
        stack.push({ value: child, depth: next.depth + 1 });
  }
  if (Buffer.byteLength(JSON.stringify(value)) > MAX_POST_BYTES)
    throw new CreatorError('Article content must be smaller than 256 KB.');
}

export function normalizeBody(value: unknown): PostDocument {
  bounded(value);
  const visit = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(visit);
    if (!value || typeof value !== 'object') return value;
    const result = Object.fromEntries(
      Object.entries(value).map(([key, value]) => [key, visit(value)]),
    );
    if ((result.type === 'swuBlock' || result.type === 'swuInline') && result.widget) {
      const widget = result.widget as Record<string, unknown>;
      if (widget.kind === 'matchup' && widget.notes) widget.notes = normalizeBody(widget.notes);
      result.props = { data: JSON.stringify(insertionSchema.parse(widget)) };
      delete result.widget;
    }
    if (result.type === 'text') result.styles ??= {};
    return result;
  };
  const input = bodyInput.parse(visit(value));
  const blocks = (rows: Record<string, unknown>[]): unknown[] =>
    rows.map(row => ({
      ...row,
      id: row.id ?? crypto.randomUUID(),
      props: row.props ?? {},
      children: blocks(z.array(z.record(z.string(), z.unknown())).parse(row.children ?? [])),
    }));
  return postDocumentSchemas.rich.parse({ version: 1, blocks: blocks(input.blocks) });
}

export function articleDocument(
  fields: z.infer<typeof articleFields>,
  previous?: CreationDocument,
): CreationDocument {
  return creationDocumentSchema.parse({
    title: 'Untitled article',
    tags: [],
    references: [],
    ...previous,
    ...fields,
    medium: 'article',
    chapters: [],
    videoDescription: '',
    durationSeconds: undefined,
    body: fields.body ? normalizeBody(fields.body) : (previous?.body ?? emptyPostDocument()),
  });
}

export const blockOperation = z.discriminatedUnion('op', [
  z.object({
    op: z.literal('insert'),
    parentId: z.string().max(100).nullable().default(null),
    beforeId: z.string().max(100).optional(),
    blocks: bodyInput.shape.blocks,
  }),
  z.object({
    op: z.literal('replace'),
    blockId: z.string().max(100),
    block: z.record(z.string(), z.unknown()),
  }),
  z.object({ op: z.literal('remove'), blockId: z.string().max(100) }),
  z.object({
    op: z.literal('move'),
    blockId: z.string().max(100),
    parentId: z.string().max(100).nullable().default(null),
    beforeId: z.string().max(100).optional(),
  }),
]);
export function editBlocks(
  document: PostDocument,
  operations: z.infer<typeof blockOperation>[],
): PostDocument {
  const next = structuredClone(document);
  const find = (
    id: string,
    blocks = next.blocks,
  ): { siblings: PostBlock[]; index: number; block: PostBlock } | undefined => {
    for (let index = 0; index < blocks.length; index++) {
      const block = blocks[index];
      if (block.id === id) return { siblings: blocks, index, block };
      const nested = find(id, block.children);
      if (nested) return nested;
    }
  };
  const requireBlock = (id: string) => {
    const result = find(id);
    if (!result) throw new CreatorError(`Block ${id} was not found.`, 409);
    return result;
  };
  for (const operation of operations) {
    if (operation.op === 'remove' || operation.op === 'replace') {
      const found = requireBlock(operation.blockId);
      if (operation.op === 'remove') found.siblings.splice(found.index, 1);
      else
        found.siblings[found.index] = normalizeBody({
          version: 1,
          blocks: [
            {
              ...found.block,
              ...operation.block,
              id: operation.blockId,
              children: operation.block.children ?? found.block.children,
              props: { ...found.block.props, ...((operation.block.props as object) ?? {}) },
            },
          ],
        }).blocks[0];
      continue;
    }
    let moving: PostBlock[];
    if (operation.op === 'move') {
      const found = requireBlock(operation.blockId);
      const contains = (block: PostBlock, id: string): boolean =>
        block.id === id || block.children.some(child => contains(child, id));
      if (operation.parentId && contains(found.block, operation.parentId))
        throw new CreatorError('A block cannot be moved inside itself.');
      if (operation.beforeId === operation.blockId) continue;
      moving = found.siblings.splice(found.index, 1);
    } else moving = normalizeBody({ version: 1, blocks: operation.blocks }).blocks;
    const siblings = operation.parentId
      ? requireBlock(operation.parentId).block.children
      : next.blocks;
    const position = operation.beforeId
      ? siblings.findIndex(block => block.id === operation.beforeId)
      : siblings.length;
    if (position < 0)
      throw new CreatorError('The insertion anchor is not in the requested parent.', 409);
    siblings.splice(position, 0, ...moving);
  }
  if (!next.blocks.length) next.blocks = emptyPostDocument().blocks;
  return postDocumentSchemas.rich.parse(next);
}

export function freshBlockIds(document: PostDocument): PostDocument {
  const copy = structuredClone(document);
  const visit = (blocks: PostBlock[]) => {
    for (const block of blocks) {
      block.id = crypto.randomUUID();
      visit(block.children);
    }
  };
  visit(copy.blocks);
  return copy;
}

export function articleOutline(document: PostDocument) {
  const rows: { id: string; type: string; depth: number; text: string }[] = [];
  const visit = (blocks: PostBlock[], depth: number) => {
    for (const block of blocks) {
      rows.push({
        id: block.id,
        type: block.type,
        depth,
        text: postPlainText({ version: 1, blocks: [{ ...block, children: [] }] }).slice(0, 240),
      });
      visit(block.children, depth + 1);
    }
  };
  visit(document.blocks, 0);
  return rows;
}

export function readableArticle(document: CreationDocument) {
  const visit = (blocks: PostBlock[]): string =>
    blocks
      .map(block => {
        const text = postPlainText({ version: 1, blocks: [{ ...block, children: [] }] });
        let value = text;
        if (block.type === 'heading') value = `${'#'.repeat(block.props.level)} ${text}`;
        if (block.type === 'swuBlock') {
          const widget = insertionSchema.parse(JSON.parse(block.props.data));
          value = `[SWUBASE ${widget.kind}: ${insertionLabel(widget)}]${insertionHref(widget) ? ` (${insertionHref(widget)})` : ''}`;
        }
        if (['image', 'audio', 'video', 'file'].includes(block.type))
          value = `[${block.type}] ${'url' in block.props ? block.props.url : ''}\n${text}`;
        return [value, visit(block.children)].filter(Boolean).join('\n\n');
      })
      .join('\n\n');
  return `# ${document.title}\n\n${document.summary}\n\n${visit(document.body.blocks)}`;
}
