import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-foundations.json.
export const jediGuardian = {
  cardId: 'jedi-guardian',
  name: 'Jedi Guardian',
  kind: 'unit',
  aspects: ['Vigilance', 'Heroism'],
  traits: ['Force', 'Jedi'],
  cost: 5,
  power: 4,
  hp: 8,
  arena: 'ground',
  constant: [
    {
      condition: {
        kind: 'unit-matches',
        target: 'source',
        filter: {
          defending: true,
        },
      },
      power: 2,
    },
  ],
} as const satisfies UnitDefinition;
