import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-effects.json.
export const raveningGundark = {
  cardId: 'ravening-gundark',
  name: 'Ravening Gundark',
  kind: 'unit',
  aspects: [],
  traits: ['Creature'],
  cost: 5,
  power: 5,
  hp: 4,
  arena: 'ground',
  triggers: [
    {
      id: 'when-played',
      timing: 'played',
      effects: [
        {
          kind: 'damage-unit',
          amount: 1,
          arena: 'ground',
          optional: false,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
