import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-effects.json.
export const dhaniPilgrim = {
  cardId: 'dhani-pilgrim',
  name: 'Dhani Pilgrim',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Fringe'],
  cost: 1,
  power: 1,
  hp: 3,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'heal-own-base',
          amount: 1,
        },
      ],
    },
    {
      id: 'defeated',
      timing: 'defeated',
      effects: [
        {
          kind: 'heal-own-base',
          amount: 1,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
