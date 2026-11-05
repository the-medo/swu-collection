import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteWildRancor = {
  cardId: 'wild-rancor',
  name: 'Wild Rancor',
  kind: 'unit',
  aspects: ['Aggression', 'Aggression'],
  traits: ['Creature'],
  cost: 6,
  power: 6,
  hp: 8,
  arena: 'ground',
  keywords: ['Overwhelm'],
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'damage-units',
          amount: 2,
          filter: {
            arena: 'ground',
            otherThan: 'source',
          },
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
