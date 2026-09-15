import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-effects.json.
export const camtono = {
  cardId: 'camtono',
  name: 'Camtono',
  kind: 'upgrade',
  aspects: ['Cunning'],
  traits: ['Item'],
  cost: 2,
  token: false,
  modifiers: {
    power: 0,
    hp: 0,
  },
  attachTo: 'unit',
  grants: {
    triggers: [
      {
        id: 'attack-ended',
        timing: 'attack-ended',
        effects: [
          {
            kind: 'inspect-zone',
            zone: 'deck',
            top: 1,
            player: 'self',
            chooser: 'self',
            filter: {},
            min: 1,
            max: 1,
            bind: 'top',
            effects: [
              {
                kind: 'play-card',
                from: 'deck',
                target: 'top',
                filter: {
                  maxCost: 2,
                },
                optional: true,
                free: true,
              },
            ],
          },
        ],
      },
    ],
  },
} as const satisfies UpgradeDefinition;
