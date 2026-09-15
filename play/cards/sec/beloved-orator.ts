import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-effects.json.
export const belovedOrator = {
  cardId: 'beloved-orator',
  name: 'Beloved Orator',
  kind: 'unit',
  aspects: ['Command', 'Heroism'],
  traits: ['New Republic', 'Official'],
  cost: 3,
  power: 2,
  hp: 3,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'create-unit',
          cardId: 'spy',
          count: 1,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
