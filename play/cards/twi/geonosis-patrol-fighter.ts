import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteGeonosisPatrolFighter = {
  cardId: 'geonosis-patrol-fighter',
  name: 'Geonosis Patrol Fighter',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Separatist', 'Vehicle', 'Fighter'],
  cost: 5,
  power: 3,
  hp: 2,
  arena: 'space',
  exploit: 2,
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            nonLeader: true,
            maxCost: 3,
          },
          optional: true,
          bind: 'chosen',
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'return-to-hand',
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
