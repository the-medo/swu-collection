import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteSnowspeeder = {
  cardId: 'snowspeeder',
  name: 'Snowspeeder',
  kind: 'unit',
  aspects: ['Heroism'],
  traits: ['Rebel', 'Vehicle', 'Speeder'],
  cost: 5,
  power: 3,
  hp: 6,
  arena: 'ground',
  keywords: ['Ambush'],
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'enemy',
            trait: 'Vehicle',
            arena: 'ground',
          },
          optional: false,
          bind: 'chosen',
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'exhaust',
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
