import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-effects.json.
export const bokkenSaber = {
  cardId: 'bokken-saber',
  name: 'Bokken Saber',
  kind: 'upgrade',
  aspects: ['Aggression'],
  traits: ['Item', 'Weapon'],
  cost: 1,
  token: false,
  modifiers: {
    power: 1,
    hp: 1,
  },
  attachTo: 'non-vehicle',
  grants: {
    triggers: [
      {
        id: 'attack-ended',
        timing: 'attack-ended',
        effects: [
          {
            kind: 'on-unit',
            target: 'source',
            operation: {
              kind: 'give-token',
              token: 'advantage',
              count: 1,
            },
          },
        ],
      },
    ],
  },
} as const satisfies UpgradeDefinition;
