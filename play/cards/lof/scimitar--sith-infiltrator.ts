import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-foundations.json.
export const scimitarSithInfiltrator = {
  cardId: 'scimitar--sith-infiltrator',
  name: 'Scimitar, Sith Infiltrator',
  kind: 'unit',
  aspects: ['Villainy'],
  traits: ['Sith', 'Vehicle', 'Transport'],
  unique: true,
  cost: 4,
  power: 3,
  hp: 4,
  arena: 'space',
  constant: [
    {
      condition: {
        kind: 'unit-matches',
        target: 'source',
        filter: {
          damaged: true,
        },
      },
      power: 3,
    },
  ],
} as const satisfies UnitDefinition;
