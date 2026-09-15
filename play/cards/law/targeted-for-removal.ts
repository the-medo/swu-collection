import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-effects.json.
export const targetedForRemoval = {
  cardId: 'targeted-for-removal',
  name: 'Targeted For Removal',
  kind: 'upgrade',
  aspects: ['Command', 'Villainy'],
  traits: ['Condition'],
  cost: 3,
  token: false,
  modifiers: {
    power: 0,
    hp: 0,
  },
  attachTo: 'unit',
  grants: {
    triggers: [
      {
        id: 'defeated',
        timing: 'defeated',
        effects: [
          {
            kind: 'create-credits',
            amount: {
              kind: 'card-cost',
              target: 'source',
            },
            player: 'enemy',
          },
        ],
      },
    ],
  },
} as const satisfies UpgradeDefinition;
