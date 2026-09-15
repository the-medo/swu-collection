import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-effects.json.
export const ataruOnslaught = {
  cardId: 'ataru-onslaught',
  name: 'Ataru Onslaught',
  kind: 'event',
  aspects: ['Aggression'],
  traits: ['Learned'],
  cost: 2,
  effects: [
    {
      kind: 'select-unit',
      filter: {
        trait: 'Force',
        powerAtMost: 4,
      },
      bind: 'chosen',
      optional: false,
      effects: [
        {
          kind: 'on-unit',
          target: 'chosen',
          operation: {
            kind: 'ready',
          },
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
