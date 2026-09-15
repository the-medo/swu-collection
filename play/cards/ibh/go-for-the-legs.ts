import type { EventDefinition } from '../definition.ts';

// Official identity and printed text are pinned in testing/fixtures/ibh.json.
export const goForTheLegs = {
  cardId: 'go-for-the-legs',
  name: 'Go for the Legs',
  kind: 'event',
  aspects: ['Cunning'],
  traits: ['Tactic'],
  cost: 1,
  effects: [
    {
      kind: 'select-unit',
      filter: {
        controller: 'enemy',
        arena: 'ground',
      },
      bind: 'chosen',
      optional: false,
      effects: [
        {
          kind: 'on-unit',
          target: 'chosen',
          operation: {
            kind: 'exhaust',
          },
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
