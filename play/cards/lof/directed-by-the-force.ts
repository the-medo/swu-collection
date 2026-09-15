import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-effects.json.
export const directedByTheForce = {
  cardId: 'directed-by-the-force',
  name: 'Directed by the Force',
  kind: 'event',
  aspects: ['Command'],
  traits: ['Force'],
  cost: 1,
  effects: [
    {
      kind: 'gain-force',
    },
    {
      kind: 'play-card',
      from: 'hand',
      filter: {
        kind: 'unit',
      },
      optional: true,
    },
  ],
} as const satisfies EventDefinition;
