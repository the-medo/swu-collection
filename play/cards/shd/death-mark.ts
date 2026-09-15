import type { UpgradeDefinition } from '../definition.ts';

// Official text is pinned in leader-bounties.json.
export const deathMark = {
  cardId: 'death-mark',
  name: 'Death Mark',
  kind: 'upgrade',
  aspects: ['Aggression'],
  traits: ['Bounty', 'Condition'],
  cost: 2,
  token: false,
  attachTo: 'unit',
  modifiers: {
    power: 0,
    hp: 0,
  },
  grants: {
    bounties: [
      {
        id: 'reward',
        effects: [
          {
            kind: 'draw-cards',
            amount: 2,
          },
        ],
      },
    ],
  },
} as const satisfies UpgradeDefinition;
