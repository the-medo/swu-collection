import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteBenduTheOneInTheMiddle = {
  cardId: 'bendu--the-one-in-the-middle',
  name: 'Bendu, The One in the Middle',
  kind: 'unit',
  aspects: ['Vigilance', 'Vigilance'],
  traits: ['Creature', 'Force'],
  cost: 6,
  unique: true,
  power: 4,
  hp: 7,
  arena: 'ground',
  keywords: ['Sentinel'],
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'next-play',
          filter: {
            withoutAspects: ['Heroism', 'Villainy'],
          },
          discount: 2,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
