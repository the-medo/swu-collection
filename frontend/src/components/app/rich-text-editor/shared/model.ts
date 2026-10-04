import { insertionSchema, type Insertion } from '../../../../../../shared/posts/widgets.ts';
export * from '../../../../../../shared/posts/widgets.ts';

export const editorCommands = [
  {
    id: 'card-image',
    label: 'Card image',
    description: 'Search for a card and insert its artwork.',
  },
  { id: 'card-link', label: 'Card link', description: 'Insert a card reference inside your text.' },
  { id: 'decklist', label: 'Decklist', description: 'Choose a SWUBASE deck to embed.' },
  {
    id: 'meta-analysis',
    label: 'Meta analysis',
    description: 'A live tournament or tournament-group chart.',
  },
  {
    id: 'matchup',
    label: 'Matchup',
    description: 'Two leader/base combinations and your game plan.',
  },
  {
    id: 'card-group',
    label: 'Card group',
    description: 'Arrange several cards with shared sizing.',
  },
  {
    id: 'callout',
    label: 'Strategy callout',
    description: 'Highlight a tip, warning, or key play.',
  },
] as const;
export type InsertKind = (typeof editorCommands)[number]['id'] | 'mention';

export function parseInsertion(value: string): Insertion | undefined {
  try {
    const result = insertionSchema.safeParse(JSON.parse(value));
    return result.success ? result.data : undefined;
  } catch {
    return undefined;
  }
}
