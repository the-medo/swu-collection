import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-effects.json.
export const twinLaserTurret = {
  cardId: 'twin-laser-turret',
  name: 'Twin Laser Turret',
  kind: 'upgrade',
  aspects: ['Aggression'],
  traits: ['Modification', 'Weapon'],
  cost: 2,
  token: false,
  modifiers: {
    power: 2,
    hp: 2,
  },
  attachTo: 'unit',
  attachFilter: {
    trait: 'Vehicle',
  },
  grants: {
    triggers: [
      {
        id: 'split-fire',
        timing: 'attack',
        effects: [
          {
            kind: 'damage-units',
            amount: 1,
            filter: {
              sameArenaAs: 'source',
            },
            max: 2,
          },
        ],
      },
    ],
  },
} as const satisfies UpgradeDefinition;
