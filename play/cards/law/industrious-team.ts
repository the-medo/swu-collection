import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-effects.json.
export const industriousTeam = {
  cardId: 'industrious-team',
  name: 'Industrious Team',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Underworld', 'Bounty Hunter'],
  cost: 8,
  power: 4,
  hp: 7,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'defeat-unit',
          filter: {
            nonLeader: true,
            remainingHpAtMost: 4,
          },
          optional: true,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
