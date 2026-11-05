import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteTheCloneWars = {
  cardId: 'the-clone-wars',
  name: 'The Clone Wars',
  kind: 'event',
  aspects: ['Command'],
  traits: ['Disaster'],
  cost: 2,
  effects: [
    {
      kind: 'select-resources',
      player: 'self',
      exhausted: false,
      min: 0,
      max: 'all',
      operation: 'exhaust',
      countAs: 'paid',
      effects: [
        {
          kind: 'create-unit',
          cardId: 'clone-trooper',
          count: {
            kind: 'value',
            name: 'paid',
          },
        },
        {
          kind: 'create-unit',
          cardId: 'battle-droid',
          count: {
            kind: 'value',
            name: 'paid',
          },
          player: 'enemy',
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
