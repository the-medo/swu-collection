import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteUnlicensedHeadhunter = {
  cardId: 'unlicensed-headhunter',
  name: 'Unlicensed Headhunter',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Underworld', 'Vehicle', 'Fighter'],
  cost: 2,
  power: 3,
  hp: 2,
  arena: 'space',
  keywords: ['Saboteur'],
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
                kind: 'heal-own-base',
                amount: 5,
              },
            ],
          },
        ],
      },
    },
  ],
} as const satisfies UnitDefinition;
