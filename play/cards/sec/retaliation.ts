import type { EventDefinition } from '../definition.ts';

// Printed text and rulings are pinned in the meta-post-search fixture.
export const retaliation = {
  cardId: 'retaliation',
  name: 'Retaliation',
  aspects: ['Vigilance'],
  traits: ['Tactic'],
  cost: 5,
  kind: 'event',
  effects: [
    {
      kind: 'defeat-unit',
      filter: {
        dealtBaseDamage: true,
      },
      optional: false,
    },
  ],
} as const satisfies EventDefinition;
