import type { EventDefinition } from '../definition.ts';

// Reprinted in IC27 175; identity and text follow the official catalog.
export const ic27ReprintShootFirst = {
  cardId: 'shoot-first',
  name: 'Shoot First',
  kind: 'event',
  aspects: ['Cunning'],
  traits: ['Trick'],
  cost: 1,
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
          powerBonus: 1,
          combatFirst: {
            kind: 'always',
          },
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
