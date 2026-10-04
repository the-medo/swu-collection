import { z } from 'zod';
import { insertionHref, insertionLabel, insertionSchema, isInlineInsertion } from './widgets.ts';

export const postTypes = ['tournament-report', 'profile-description'] as const;
export type PostType = (typeof postTypes)[number];
export const MAX_POST_BYTES = 256_000;

// This is the persisted v1 format, independent of BlockNote's React/editor internals.
const color = z
  .string()
  .max(100)
  .regex(/^[\w#(),.% /-]+$/);
const alignment = z.enum(['left', 'center', 'right', 'justify']);
const commonProps = z.object({
  textColor: color.optional(),
  backgroundColor: color.optional(),
  textAlignment: alignment.optional(),
});
const safeLink = z
  .string()
  .max(2048, 'Links can contain at most 2,048 characters.')
  .refine(value => {
    if (/[\s\\\u0000-\u001f\u007f]/.test(value)) return false;
    if (/^\/(?!\/)/.test(value) || value.startsWith('#')) return true;
    try {
      return ['https:', 'http:', 'mailto:'].includes(new URL(value).protocol);
    } catch {
      return false;
    }
  }, 'Use an http, https, mailto, or relative link.');
const mediaUrl = z.union([
  z.literal(''),
  safeLink.refine(value => /^https?:\/\//i.test(value), 'Media requires an http or https URL.'),
]);
const styles = z
  .object({
    bold: z.boolean().optional(),
    italic: z.boolean().optional(),
    underline: z.boolean().optional(),
    strike: z.boolean().optional(),
    code: z.boolean().optional(),
    textColor: color.optional(),
    backgroundColor: color.optional(),
  })
  .strict();
const text = z.object({ type: z.literal('text'), text: z.string(), styles });
const embedData = (inline: boolean) =>
  z
    .string()
    .max(MAX_POST_BYTES)
    .transform((data, ctx) => {
      try {
        const value = insertionSchema.parse(JSON.parse(data));
        if (isInlineInsertion(value) !== inline) throw new Error('Incorrect widget placement');
        return JSON.stringify(value);
      } catch {
        ctx.addIssue({ code: 'custom', message: 'Invalid SWUBASE widget.' });
        return z.NEVER;
      }
    });
const inline = z.union([
  text,
  z.object({ type: z.literal('link'), href: safeLink, content: z.array(text).max(1000) }),
  z.object({ type: z.literal('swuInline'), props: z.object({ data: embedData(true) }) }),
]);
const inlineContent = z
  .array(inline)
  .max(1000, 'This block has too many formatted fragments. Split it into smaller paragraphs.');
const cell = z.object({
  type: z.literal('tableCell'),
  props: commonProps.extend({
    colspan: z.number().int().min(1).max(20, 'Tables can have at most 20 columns.').optional(),
    rowspan: z.number().int().min(1).max(100).optional(),
  }),
  content: inlineContent,
});
const table = z.object({
  type: z.literal('tableContent'),
  columnWidths: z
    .array(z.number().min(0).max(10000).nullish())
    .min(1)
    .max(20, 'Tables can have at most 20 columns.'),
  headerRows: z.number().int().min(0).max(100).optional(),
  headerCols: z.number().int().min(0).max(20).optional(),
  rows: z
    .array(
      z.object({
        cells: z
          .array(z.union([inlineContent, cell]))
          .min(1)
          .max(20, 'Tables can have at most 20 columns.'),
      }),
    )
    .min(1)
    .max(100, 'Tables can have at most 100 rows.'),
});
const mediaProps = commonProps.extend({
  name: z.string().max(255).optional(),
  url: mediaUrl,
  caption: z.string().max(5000, 'Media captions can contain at most 5,000 characters.').optional(),
  showPreview: z.boolean().optional(),
  previewWidth: z.number().positive().max(10000).optional(),
});
const node = z.discriminatedUnion('type', [
  z.object({
    type: z.enum(['paragraph', 'bulletListItem', 'quote', 'toggleListItem']),
    props: commonProps,
    content: inlineContent,
  }),
  z.object({
    type: z.literal('heading'),
    props: commonProps.extend({
      level: z.union([
        z.literal(1),
        z.literal(2),
        z.literal(3),
        z.literal(4),
        z.literal(5),
        z.literal(6),
      ]),
      isToggleable: z.boolean().optional(),
    }),
    content: inlineContent,
  }),
  z.object({
    type: z.literal('numberedListItem'),
    props: commonProps.extend({ start: z.number().int().min(1).max(1_000_000).optional() }),
    content: inlineContent,
  }),
  z.object({
    type: z.literal('checkListItem'),
    props: commonProps.extend({ checked: z.boolean() }),
    content: inlineContent,
  }),
  z.object({
    type: z.literal('codeBlock'),
    props: z.object({ language: z.string().max(100) }),
    content: z.array(text.extend({ styles: z.object({}).strict() })).max(1000),
  }),
  z.object({ type: z.literal('divider'), props: z.object({}) }),
  z.object({ type: z.enum(['image', 'audio', 'video', 'file']), props: mediaProps }),
  z.object({ type: z.literal('table'), props: commonProps, content: table }),
  z.object({ type: z.literal('swuBlock'), props: z.object({ data: embedData(false) }) }),
]);
export type PostBlock = z.infer<typeof node> & { id: string; children: PostBlock[] };
const block: z.ZodType<PostBlock> = z.lazy(() =>
  z.intersection(
    node,
    z.object({
      id: z.string().min(1).max(100),
      children: z.array(block).max(500, 'Posts can contain at most 500 blocks.'),
    }),
  ),
);

// Bound nesting before recursive schema validation (including deeply nested malformed JSON).
const boundedJson = z.unknown().superRefine((value, ctx) => {
  const stack = [{ value, depth: 0 }];
  let count = 0;
  while (stack.length) {
    const current = stack.pop()!;
    if (++count > 30_000 || current.depth > 32) {
      ctx.addIssue({ code: 'custom', message: 'This post is too complex.' });
      return;
    }
    if (current.value && typeof current.value === 'object') {
      for (const child of Object.values(current.value))
        stack.push({ value: child, depth: current.depth + 1 });
    }
  }
  if (new TextEncoder().encode(JSON.stringify(value)).length > MAX_POST_BYTES)
    ctx.addIssue({ code: 'custom', message: 'Posts must be smaller than 256 KB.' });
});
export const postDocumentSchema = boundedJson
  .pipe(
    z.object({
      version: z.literal(1),
      blocks: z.array(block).min(1).max(500, 'Posts can contain at most 500 blocks.'),
    }),
  )
  .superRefine((document, ctx) => {
    const ids = new Set<string>();
    let metaWidgets = 0;
    const visit = (blocks: PostBlock[], depth: number) => {
      for (const block of blocks) {
        if (depth > 8 || ids.has(block.id) || ids.size >= 500) {
          ctx.addIssue({
            code: 'custom',
            message: 'Posts allow 500 unique blocks and eight levels of nesting.',
          });
          return;
        }
        if (
          block.type === 'swuBlock' &&
          JSON.parse(block.props.data).kind === 'meta-analysis' &&
          ++metaWidgets > 3
        ) {
          ctx.addIssue({
            code: 'custom',
            message: 'A post can contain at most three meta analysis widgets.',
          });
          return;
        }
        ids.add(block.id);
        visit(block.children, depth + 1);
      }
    };
    visit(document.blocks, 1);
  });
export type PostDocument = z.infer<typeof postDocumentSchema>;
export type EditorType = 'simple' | 'rich';

export function hasSwubaseContent(document: PostDocument): boolean {
  const visit = (value: unknown): boolean => {
    if (!value || typeof value !== 'object') return false;
    if ('type' in value && (value.type === 'swuBlock' || value.type === 'swuInline')) return true;
    return Object.values(value).some(visit);
  };
  return visit(document.blocks);
}

export const postDocumentSchemas = {
  simple: postDocumentSchema.refine(document => !hasSwubaseContent(document), {
    message: 'SWUBASE widgets and mentions are not available in this editor.',
  }),
  rich: postDocumentSchema,
} satisfies Record<EditorType, typeof postDocumentSchema>;

// Older bios can contain rich widgets. Preserve their labels, prose, links, and
// child blocks when displaying/editing them with the simple schema.
export function toSimplePostDocument(document: PostDocument): PostDocument {
  const fallback = (data: string): z.infer<typeof inline>[] => {
    const value = insertionSchema.parse(JSON.parse(data));
    const text = { type: 'text' as const, text: insertionLabel(value), styles: {} };
    const href = insertionHref(value);
    return [href ? { type: 'link', href, content: [text] } : text];
  };
  const convertInline = (items: z.infer<typeof inline>[]) =>
    items.flatMap(item => (item.type === 'swuInline' ? fallback(item.props.data) : [item]));
  const convertBlock = (block: PostBlock): PostBlock => {
    const children = block.children.map(convertBlock);
    if (block.type === 'swuBlock')
      return {
        id: block.id,
        type: 'paragraph',
        props: {},
        content: fallback(block.props.data),
        children,
      };
    if (block.type === 'table')
      return {
        ...block,
        children,
        content: {
          ...block.content,
          rows: block.content.rows.map(row => ({
            cells: row.cells.map(cell =>
              Array.isArray(cell)
                ? convertInline(cell)
                : { ...cell, content: convertInline(cell.content) },
            ),
          })),
        },
      };
    if ('content' in block && block.type !== 'codeBlock')
      return { ...block, content: convertInline(block.content), children };
    return { ...block, children };
  };
  return { ...document, blocks: document.blocks.map(convertBlock) };
}

export const saveProfilePostSchema = z
  .object({
    content: postDocumentSchemas.simple,
    revision: z.number().int().positive().nullable(),
  })
  .strict();
export type Post = {
  id: string;
  authorId: string;
  type: PostType;
  content: PostDocument;
  revision: number;
  createdAt: string;
  updatedAt: string;
};
export const emptyPostDocument = (): PostDocument => ({
  version: 1,
  blocks: [{ id: crypto.randomUUID(), type: 'paragraph', props: {}, content: [], children: [] }],
});
export function isPostEmpty(document: PostDocument) {
  return document.blocks.every(
    block =>
      block.type === 'paragraph' &&
      !block.children.length &&
      block.content.every(item => item.type === 'text' && !item.text.trim()),
  );
}

export function postValidationMessage(error: Pick<z.ZodError, 'issues'>) {
  const issue = error.issues[0];
  if (!issue) return 'Invalid post content.';
  const blockIndex = issue.path.indexOf('blocks');
  const position = issue.path[blockIndex + 1];
  const location = blockIndex >= 0 && typeof position === 'number' ? `Block ${position + 1}: ` : '';
  return `${location}${issue.message}`;
}
