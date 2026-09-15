import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-effects.json.
export const thermalDetonator = {
  cardId: 'thermal-detonator',
  name: 'Thermal Detonator',
  kind: 'upgrade',
  aspects: ['Aggression'],
  traits: ['Item', 'Weapon'],
  cost: 3,
  token: false,
  modifiers: {
    power: 1,
    hp: 1,
  },
  attachTo: 'non-vehicle',
  grants: {
    triggers: [
      {
        id: 'defeated',
        timing: 'defeated',
        effects: [
          {
            kind: 'damage-units',
            amount: 2,
            filter: {
              controller: 'enemy',
              arena: 'ground',
            },
            mandatory: true,
          },
        ],
        condition: {
          kind: 'card-ready',
          target: 'source',
        },
      },
    ],
  },
} as const satisfies UpgradeDefinition;
