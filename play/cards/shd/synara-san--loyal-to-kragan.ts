import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteSynaraSanLoyalToKragan = {
  cardId: 'synara-san--loyal-to-kragan',
  name: 'Synara San, Loyal to Kragan',
  kind: 'unit',
  aspects: ['Villainy', 'Vigilance'],
  traits: ['Underworld'],
  cost: 4,
  unique: true,
  power: 3,
  hp: 6,
  arena: 'ground',
  keywords: ['Grit'],
  constant: [
    {
      condition: {
        kind: 'unit-matches',
        target: 'source',
        filter: {
          exhausted: true,
        },
      },
      abilities: {
        bounties: [
          {
            id: 'bounty',
            effects: [
              {
                kind: 'select-target',
                bases: 'any',
                bind: 'chosen',
                optional: false,
                effects: [
                  {
                    kind: 'damage-target',
                    target: 'chosen',
                    amount: 5,
                  },
                ],
              },
            ],
          },
        ],
      },
    },
  ],
} as const satisfies UnitDefinition;
