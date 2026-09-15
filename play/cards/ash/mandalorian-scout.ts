import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-effects.json.
export const mandalorianScout = {
  cardId: 'mandalorian-scout',
  name: 'Mandalorian Scout',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Mandalorian'],
  cost: 2,
  power: 3,
  hp: 3,
  arena: 'ground',
  triggers: [
    {
      id: 'defeated',
      timing: 'defeated',
      effects: [
        {
          kind: 'select-resources',
          player: 'self',
          exhausted: false,
          min: 1,
          max: 1,
          operation: 'exhaust',
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
