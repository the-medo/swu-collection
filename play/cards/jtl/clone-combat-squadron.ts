import type { UnitDefinition } from '../definition.ts';

// JTL 115. Printed text is pinned in meta-continuous fixture.
export const cloneCombatSquadron = {
  cardId: 'clone-combat-squadron',
  name: 'Clone Combat Squadron',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Republic', 'Vehicle', 'Fighter'],
  cost: 4,
  power: 3,
  hp: 3,
  arena: 'space',
  constant: [
    {
      condition: {
        kind: 'always',
      },
      power: {
        kind: 'unit-count',
        filter: {
          controller: 'friendly',
          arena: 'space',
          otherThan: 'source',
        },
      },
      hp: {
        kind: 'unit-count',
        filter: {
          controller: 'friendly',
          arena: 'space',
          otherThan: 'source',
        },
      },
    },
  ],
} as const satisfies UnitDefinition;
