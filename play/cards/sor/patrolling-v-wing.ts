import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-foundations.json.
export const earlySetPatrollingVWing = {
  cardId: 'patrolling-v-wing',
  name: 'Patrolling V-Wing',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Vehicle', 'Fighter'],
  cost: 2,
  power: 1,
  hp: 1,
  arena: 'space',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'draw-cards',
          amount: 1,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
