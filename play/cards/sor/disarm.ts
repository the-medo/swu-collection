import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-foundations.json.
export const earlySetDisarm = {
  cardId: 'disarm',
  name: 'Disarm',
  kind: 'event',
  aspects: ['Cunning'],
  traits: ['Tactic'],
  cost: 1,
  effects: [
    {
      kind: 'select-unit',
      filter: {
        controller: 'enemy',
      },
      bind: 'chosen',
      optional: false,
      effects: [
        {
          kind: 'on-unit',
          target: 'chosen',
          operation: {
            kind: 'modify',
            power: -4,
            hp: 0,
            duration: 'phase',
          },
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
