import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-foundations.json.
export const figureOfUnity = {
  cardId: 'figure-of-unity',
  name: 'Figure of Unity',
  kind: 'upgrade',
  aspects: ['Command', 'Heroism'],
  traits: ['Innate'],
  unique: true,
  cost: 3,
  token: false,
  modifiers: {
    power: 2,
    hp: 2,
  },
  attachTo: 'unit',
  attachFilter: {
    unique: true,
  },
  grants: {
    auras: [
      {
        id: 'united-allies',
        filter: {
          controller: 'friendly',
          otherThan: 'source',
          condition: {
            kind: 'card-ready',
            target: 'source',
          },
        },
        abilities: {
          keywords: ['Overwhelm'],
          raid: 1,
          restore: 1,
        },
      },
    ],
  },
} as const satisfies UpgradeDefinition;
