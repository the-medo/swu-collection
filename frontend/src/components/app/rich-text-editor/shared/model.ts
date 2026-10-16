import { insertionSchema, type Insertion } from '../../../../../../shared/posts/widgets.ts';
import type { PostBlock } from '../../../../../../shared/posts/content.ts';
export * from '../../../../../../shared/posts/widgets.ts';

// Picker results may insert native editor blocks without becoming stored widgets.
export type EditorInsertion =
  | Insertion
  | {
      kind: 'image';
      props: Extract<PostBlock, { type: 'image' | 'audio' | 'video' | 'file' }>['props'];
    };

export type InsertKind = Insertion['kind'];

export function parseInsertion(value: string): Insertion | undefined {
  try {
    const result = insertionSchema.safeParse(JSON.parse(value));
    return result.success ? result.data : undefined;
  } catch {
    return undefined;
  }
}
