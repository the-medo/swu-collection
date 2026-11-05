import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteVambraceFlamethrower = {
  cardId: 'vambrace-flamethrower',
  name: 'Vambrace Flamethrower',
  kind: 'upgrade',
  aspects: ['Aggression'],
  traits: ['Item', 'Armor', 'Weapon'],
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
        id: 'attack',
        timing: 'attack',
        effects: [
          {
            kind: 'divide-damage',
            amount: 3,
            filter: {
              controller: 'enemy',
              arena: 'ground',
            },
            optional: true,
          },
        ],
      },
    ],
  },
} as const satisfies UpgradeDefinition;
