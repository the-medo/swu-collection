import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-effects.json.
export const flyCasual = {
  cardId: 'fly-casual',
  name: 'Fly Casual',
  kind: 'event',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Trick'],
  cost: 1,
  effects: [
    {
      kind: 'select-unit',
      filter: {
        trait: 'Vehicle',
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
        {
          kind: 'on-unit',
          target: 'chosen',
          operation: {
            kind: 'modify',
            power: 0,
            hp: 0,
            duration: 'phase',
            cannotAttackBases: true,
          },
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
