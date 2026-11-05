import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteZiroTheHuttColorfulSchemer = {
  cardId: 'ziro-the-hutt--colorful-schemer',
  name: 'Ziro the Hutt, Colorful Schemer',
  kind: 'unit',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Underworld', 'Hutt'],
  cost: 5,
  unique: true,
  power: 2,
  hp: 8,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'enemy',
          },
          optional: true,
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
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'select-resources',
          player: 'enemy',
          exhausted: 'any',
          min: 0,
          max: 1,
          operation: 'exhaust',
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
