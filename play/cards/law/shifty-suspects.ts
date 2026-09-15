import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-history.json.
export const shiftySuspects = {
  cardId: 'shifty-suspects',
  name: 'Shifty Suspects',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Underworld', 'Bounty Hunter'],
  cost: 4,
  power: 4,
  hp: 5,
  arena: 'ground',
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'prevent-base-healing',
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
