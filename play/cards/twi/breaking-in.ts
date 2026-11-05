import type { EventDefinition } from '../definition.ts';

// Reprinted in IC27 176; identity and text follow the official catalog.
export const ic27ReprintBreakingIn = {
  cardId: 'breaking-in',
  name: 'Breaking In',
  kind: 'event',
  aspects: ['Cunning'],
  traits: ['Tactic'],
  cost: 2,
  effects: [
    {
      kind: 'select-unit',
      forAttack: {},
      filter: {
        controller: 'friendly',
      },
      bind: 'chosen',
      optional: false,
      effects: [
        {
          kind: 'attack-bound',
          target: 'chosen',
          optional: false,
          powerBonus: 2,
          abilities: {
            keywords: ['Saboteur'],
          },
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
