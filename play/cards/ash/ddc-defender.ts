import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-effects.json.
export const ddcDefender = {
  cardId: 'ddc-defender',
  name: 'DDC Defender',
  kind: 'upgrade',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Item', 'Weapon'],
  cost: 1,
  token: false,
  modifiers: {
    power: 1,
    hp: 0,
  },
  attachTo: 'non-vehicle',
  grants: {
    triggers: [
      {
        id: 'attacked',
        timing: 'attacked',
        effects: [
          {
            kind: 'select-unit',
            filter: {
              sameArenaAs: 'source',
            },
            optional: true,
            bind: 'chosen',
            effects: [
              {
                kind: 'on-unit',
                target: 'chosen',
                operation: {
                  kind: 'damage',
                  amount: 1,
                },
              },
              {
                kind: 'on-unit',
                target: 'chosen',
                operation: {
                  kind: 'exhaust',
                },
              },
            ],
          },
        ],
      },
    ],
  },
} as const satisfies UpgradeDefinition;
