import type { UpgradeDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 observer fixture.
export const whistlingBirds = {
  cardId: 'whistling-birds',
  name: 'Whistling Birds',
  kind: 'upgrade',
  aspects: ['Aggression'],
  traits: ['Item', 'Weapon'],
  cost: 3,
  token: false,
  modifiers: {
    power: 2,
    hp: 2,
  },
  attachTo: 'non-vehicle',
  grants: {
    triggers: [
      {
        id: 'arena-damage',
        timing: 'attack-ended',
        effects: [
          {
            kind: 'damage-units',
            amount: 2,
            filter: {
              controller: 'enemy',
              sameArenaAs: 'source',
            },
            mandatory: true,
          },
        ],
        condition: {
          kind: 'value-at-least',
          name: 'combat-opponent-base-damage',
          amount: 1,
        },
      },
    ],
  },
} as const satisfies UpgradeDefinition;
