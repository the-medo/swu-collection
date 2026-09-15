import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-effects.json.
export const rafaMartezShrewdSister = {
  cardId: 'rafa-martez--shrewd-sister',
  name: 'Rafa Martez, Shrewd Sister',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Underworld'],
  unique: true,
  cost: 3,
  power: 3,
  hp: 3,
  arena: 'ground',
  triggers: [
    {
      id: 'shrewd-played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'friendly',
          },
          bind: 'chosen',
          optional: false,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'damage',
                amount: 1,
              },
            },
          ],
        },
        {
          kind: 'select-resources',
          player: 'self',
          exhausted: 'any',
          min: 1,
          max: 1,
          operation: 'ready',
        },
      ],
    },
    {
      id: 'shrewd-attack',
      timing: 'attack',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'friendly',
          },
          bind: 'chosen',
          optional: false,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'damage',
                amount: 1,
              },
            },
          ],
        },
        {
          kind: 'select-resources',
          player: 'self',
          exhausted: 'any',
          min: 1,
          max: 1,
          operation: 'ready',
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
