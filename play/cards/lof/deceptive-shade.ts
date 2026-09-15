import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-effects.json.
export const deceptiveShade = {
  cardId: 'deceptive-shade',
  name: 'Deceptive Shade',
  kind: 'unit',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Sith'],
  cost: 2,
  power: 2,
  hp: 3,
  arena: 'ground',
  triggers: [
    {
      id: 'when-defeated',
      timing: 'defeated',
      effects: [
        {
          kind: 'next-play',
          filter: {
            kind: 'unit',
          },
          phaseAbilities: {
            keywords: ['Ambush'],
          },
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
