import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-foundations.json.
export const highCommandCouncilor = {
  cardId: 'high-command-councilor',
  name: 'High Command Councilor',
  kind: 'unit',
  aspects: ['Heroism'],
  traits: ['Rebel', 'Official'],
  cost: 2,
  power: 1,
  hp: 4,
  arena: 'ground',
  constant: [
    {
      condition: {
        kind: 'units-at-least',
        filter: {
          controller: 'friendly',
          trait: 'Official',
          otherThan: 'source',
        },
        amount: 1,
      },
      abilities: {
        raid: 2,
      },
    },
  ],
} as const satisfies UnitDefinition;
