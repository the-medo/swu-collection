import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-effects.json.
export const synaraSanHarboringASecret = {
  cardId: 'synara-san--harboring-a-secret',
  name: 'Synara San, Harboring a Secret',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Underworld'],
  unique: true,
  cost: 7,
  power: 7,
  hp: 7,
  arena: 'ground',
  keywords: ['Hidden'],
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'select-resources',
          player: 'self',
          exhausted: true,
          min: {
            kind: 'unit-count',
            filter: {
              controller: 'friendly',
            },
          },
          max: {
            kind: 'unit-count',
            filter: {
              controller: 'friendly',
            },
          },
          operation: 'ready',
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
