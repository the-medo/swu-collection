import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 token/effect fixture.
export const hanSoloItLlWork = {
  cardId: 'han-solo--it-ll-work',
  name: "Han Solo, It'll Work",
  kind: 'unit',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Rebel', 'Official'],
  unique: true,
  cost: 4,
  power: 3,
  hp: 7,
  arena: 'ground',
  keywords: ['Saboteur'],
  triggers: [
    {
      id: 'gain-advantage',
      timing: 'played',
      effects: [
        {
          kind: 'on-unit',
          target: 'source',
          operation: {
            kind: 'damage',
            amount: 3,
          },
        },
        {
          kind: 'select-unit',
          filter: {},
          bind: 'chosen',
          optional: false,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'give-token',
                token: 'advantage',
                count: 3,
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
