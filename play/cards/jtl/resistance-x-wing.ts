import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-foundations.json.
export const resistanceXWing = {
  cardId: 'resistance-x-wing',
  name: 'Resistance X-Wing',
  kind: 'unit',
  aspects: ['Heroism'],
  traits: ['Resistance', 'Vehicle', 'Fighter'],
  cost: 2,
  power: 2,
  hp: 2,
  arena: 'space',
  constant: [
    {
      condition: {
        kind: 'unit-matches',
        target: 'source',
        filter: {
          upgradeTrait: 'Pilot',
        },
      },
      power: 1,
      hp: 1,
    },
  ],
} as const satisfies UnitDefinition;
