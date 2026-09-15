import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-attributes.json.
export const leiaOrganaExtraordinary = {
  cardId: 'leia-organa--extraordinary',
  name: 'Leia Organa, Extraordinary',
  kind: 'unit',
  aspects: ['Command', 'Heroism'],
  traits: ['Force', 'Resistance', 'Official'],
  unique: true,
  cost: 5,
  power: 5,
  hp: 5,
  arena: 'space',
  constant: [
    {
      condition: {
        kind: 'unit-matches',
        target: 'source',
        filter: {
          arena: 'space',
        },
      },
      abilities: {
        cannotReady: true,
      },
    },
  ],
  actions: [
    {
      id: 'extraordinary-return',
      condition: {
        kind: 'unit-matches',
        target: 'source',
        filter: {
          arena: 'space',
        },
      },
      costs: [
        {
          kind: 'force',
        },
      ],
      limit: null,
      effects: [
        {
          kind: 'on-unit',
          target: 'source',
          operation: {
            kind: 'move-arena',
            arena: 'ground',
          },
        },
        {
          kind: 'modify-units',
          filter: {
            controller: 'friendly',
            anyAspect: ['Heroism'],
          },
          operation: {
            kind: 'modify',
            power: 2,
            hp: 2,
            duration: 'phase',
          },
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
