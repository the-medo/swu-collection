import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-effects.json.
export const younglingPadawan = {
  cardId: 'youngling-padawan',
  name: 'Youngling Padawan',
  kind: 'unit',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Force', 'Jedi'],
  cost: 2,
  power: 2,
  hp: 3,
  arena: 'ground',
  triggers: [
    {
      id: 'when-played',
      timing: 'played',
      effects: [
        {
          kind: 'gain-force',
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
