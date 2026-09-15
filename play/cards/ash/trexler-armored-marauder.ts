import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-effects.json.
export const trexlerArmoredMarauder = {
  cardId: 'trexler-armored-marauder',
  name: 'Trexler Armored Marauder',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Imperial', 'Vehicle', 'Tank'],
  cost: 6,
  power: 5,
  hp: 6,
  arena: 'ground',
  keywords: ['Grit'],
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            maxCost: 3,
          },
          optional: true,
          bind: 'chosen',
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'give-token',
                token: 'shield',
                count: 1,
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
