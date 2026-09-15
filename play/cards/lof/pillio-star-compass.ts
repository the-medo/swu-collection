import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-effects.json.
export const pillioStarCompass = {
  cardId: 'pillio-star-compass',
  name: 'Pillio Star Compass',
  kind: 'upgrade',
  aspects: ['Command'],
  traits: ['Item'],
  unique: true,
  cost: 2,
  token: false,
  modifiers: {
    power: 1,
    hp: 1,
  },
  attachTo: 'non-vehicle',
  triggers: [
    {
      id: 'when-played',
      timing: 'played',
      effects: [
        {
          kind: 'search-deck',
          count: 3,
          filter: 'unit',
          max: 1,
        },
      ],
    },
  ],
} as const satisfies UpgradeDefinition;
