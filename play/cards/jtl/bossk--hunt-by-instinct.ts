import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-effects.json.
export const bosskHuntByInstinct = {
  cardId: 'bossk--hunt-by-instinct',
  name: 'Bossk, Hunt By Instinct',
  kind: 'unit',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Underworld', 'Bounty Hunter', 'Pilot'],
  unique: true,
  cost: 4,
  power: 4,
  hp: 4,
  arena: 'ground',
  triggers: [
    {
      id: 'hunt',
      timing: 'attack',
      effects: [
        {
          kind: 'on-unit',
          target: 'defender',
          operation: {
            kind: 'exhaust',
          },
        },
        {
          kind: 'on-unit',
          target: 'defender',
          operation: {
            kind: 'damage',
            amount: 1,
          },
        },
      ],
    },
  ],
  piloting: [
    {
      id: 'piloting',
      cost: 2,
      aspects: ['Cunning', 'Villainy'],
    },
  ],
  upgrade: {
    attachTo: 'friendly-vehicle-without-pilot',
    modifiers: {
      power: 2,
      hp: 2,
    },
    grants: {
      triggers: [
        {
          id: 'hunt',
          timing: 'attack',
          effects: [
            {
              kind: 'on-unit',
              target: 'defender',
              operation: {
                kind: 'exhaust',
              },
            },
            {
              kind: 'on-unit',
              target: 'defender',
              operation: {
                kind: 'damage',
                amount: 1,
              },
            },
          ],
        },
      ],
    },
  },
} as const satisfies UnitDefinition;
