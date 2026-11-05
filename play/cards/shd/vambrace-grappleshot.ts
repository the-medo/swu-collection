import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteVambraceGrappleshot = {
  cardId: 'vambrace-grappleshot',
  name: 'Vambrace Grappleshot',
  kind: 'upgrade',
  aspects: ['Vigilance'],
  traits: ['Item', 'Armor', 'Weapon'],
  cost: 2,
  token: false,
  modifiers: {
    power: 2,
    hp: 2,
  },
  attachTo: 'non-vehicle',
  grants: {
    triggers: [
      {
        id: 'attack',
        timing: 'attack',
        effects: [
          {
            kind: 'on-unit',
            target: 'defender',
            operation: {
              kind: 'exhaust',
            },
          },
        ],
      },
    ],
  },
} as const satisfies UpgradeDefinition;
