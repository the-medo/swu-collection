import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-effects.json.
export const childrenOfTheWatch = {
  cardId: 'children-of-the-watch',
  name: 'Children of the Watch',
  kind: 'unit',
  aspects: ['Command', 'Heroism'],
  traits: ['Mandalorian'],
  cost: 6,
  power: 3,
  hp: 3,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'create-unit',
          cardId: 'mandalorian',
          count: 2,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
