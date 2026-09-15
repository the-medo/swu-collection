import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-effects.json.
export const zealousSoldier = {
  cardId: 'zealous-soldier',
  name: 'Zealous Soldier',
  kind: 'unit',
  aspects: ['Heroism'],
  traits: ['Rebel', 'Trooper'],
  cost: 2,
  power: 2,
  hp: 3,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'on-unit',
          target: 'source',
          operation: {
            kind: 'give-token',
            token: 'advantage',
            count: 1,
          },
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
