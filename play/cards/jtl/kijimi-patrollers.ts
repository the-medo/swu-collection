import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-foundations.json.
export const kijimiPatrollers = {
  cardId: 'kijimi-patrollers',
  name: 'Kijimi Patrollers',
  kind: 'unit',
  aspects: ['Command', 'Villainy'],
  traits: ['First Order', 'Vehicle', 'Fighter'],
  cost: 2,
  power: 1,
  hp: 1,
  arena: 'space',
  triggers: [
    {
      id: 'launch',
      timing: 'played',
      effects: [
        {
          kind: 'create-unit',
          cardId: 'tie-fighter',
          count: 1,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
