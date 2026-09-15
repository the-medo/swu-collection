import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-foundations.json.
export const disciplesDevotion = {
  cardId: 'disciples--devotion',
  name: "Disciples' Devotion",
  kind: 'upgrade',
  aspects: ['Vigilance'],
  traits: ['Innate'],
  cost: 3,
  token: false,
  modifiers: {
    power: 1,
    hp: 3,
  },
  attachTo: 'unit',
  grants: {
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
          keywords: ['Sentinel'],
        },
      },
    ],
  },
} as const satisfies UpgradeDefinition;
