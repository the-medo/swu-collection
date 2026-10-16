import type { PostBlock } from './content.ts';
import type { Insertion } from './widgets.ts';

export const paragraph = (text = ''): PostBlock & { type: 'paragraph' } => ({
  id: crypto.randomUUID(),
  type: 'paragraph',
  props: {},
  children: [],
  content: text ? [{ type: 'text', text, styles: {} }] : [],
});
export const heading = (title: string, level: 2 | 3 = 2): PostBlock & { type: 'heading' } => ({
  id: crypto.randomUUID(),
  type: 'heading',
  props: { level },
  children: [],
  content: [{ type: 'text', text: title, styles: {} }],
});
export const widget = (value: Insertion): PostBlock => ({
  id: crypto.randomUUID(),
  type: 'swuBlock',
  props: { data: JSON.stringify(value) },
  children: [],
});
export const toggleSection = (title: string, children: PostBlock[]): PostBlock => ({
  ...heading(title),
  props: { level: 2, isToggleable: true, defaultOpen: true },
  children,
});
