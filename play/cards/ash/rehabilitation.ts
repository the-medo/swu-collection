import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-effects.json.
export const rehabilitation = {
  cardId: 'rehabilitation',
  name: 'Rehabilitation',
  kind: 'event',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Learned'],
  cost: 5,
  effects: [
    {
      kind: 'select-unit',
      filter: {
        nonLeader: true,
      },
      optional: false,
      bind: 'chosen',
      effects: [
        {
          kind: 'on-unit',
          target: 'chosen',
          operation: {
            kind: 'modify',
            power: -3,
            hp: 0,
            duration: 'phase',
          },
        },
        {
          kind: 'on-unit',
          target: 'chosen',
          operation: {
            kind: 'take-control',
            player: 'self',
            returnWhen: 'regroup',
          },
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
