import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-effects.json.
export const warJuggernaut = {
  cardId: 'war-juggernaut',
  name: 'War Juggernaut',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Republic', 'Vehicle', 'Tank'],
  cost: 6,
  power: 3,
  hp: 7,
  arena: 'ground',
  constant: [
    {
      condition: {
        kind: 'always',
      },
      power: {
        kind: 'unit-count',
        filter: {
          damaged: true,
        },
      },
    },
  ],
  triggers: [
    {
      id: 'damage-any-units',
      timing: 'played',
      effects: [
        {
          kind: 'damage-units',
          amount: 1,
          filter: {},
          max: {
            kind: 'unit-count',
            filter: {},
          },
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
