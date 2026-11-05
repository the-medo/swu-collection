import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteMasAmeddaViceChair = {
  cardId: 'mas-amedda--vice-chair',
  name: 'Mas Amedda, Vice Chair',
  kind: 'unit',
  aspects: ['Command', 'Command'],
  traits: ['Republic', 'Official'],
  cost: 2,
  unique: true,
  power: 0,
  hp: 4,
  arena: 'ground',
  triggers: [
    {
      id: 'friendly-played',
      timing: 'friendly-played',
      effects: [
        {
          kind: 'choose-mode',
          options: [
            {
              id: 'resolve',
              effects: [
                {
                  kind: 'on-unit',
                  target: 'source',
                  operation: {
                    kind: 'exhaust',
                  },
                  ifYouDo: [
                    {
                      kind: 'search-deck',
                      count: 4,
                      max: 1,
                      filter: 'unit',
                    },
                  ],
                },
              ],
            },
            {
              id: 'decline',
              effects: [],
            },
          ],
        },
      ],
      excludeSelf: true,
    },
  ],
} as const satisfies UnitDefinition;
