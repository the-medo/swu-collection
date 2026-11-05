import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteIHaveTheHighGround = {
  cardId: 'i-have-the-high-ground',
  name: 'I Have the High Ground',
  kind: 'event',
  aspects: ['Vigilance'],
  traits: ['Tactic'],
  cost: 1,
  effects: [
    {
      kind: 'select-unit',
      filter: {
        controller: 'friendly',
      },
      optional: false,
      bind: 'chosen',
      effects: [
        {
          kind: 'on-unit',
          target: 'chosen',
          operation: {
            kind: 'modify',
            power: 0,
            hp: 0,
            duration: 'phase',
            defendingAttackerPower: -4,
          },
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
