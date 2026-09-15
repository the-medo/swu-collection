import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-interactions.json.
export const dorsalTurret = {
  cardId: 'dorsal-turret',
  name: 'Dorsal Turret',
  kind: 'upgrade',
  aspects: ['Command'],
  traits: ['Modification', 'Weapon'],
  cost: 1,
  token: false,
  modifiers: {
    power: 0,
    hp: 0,
  },
  attachTo: 'unit',
  attachFilter: {
    trait: 'Vehicle',
  },
  grants: {
    triggers: [
      {
        id: 'combat-defeat',
        timing: 'attacking-unit-damage-dealt',
        effects: [
          {
            kind: 'on-unit',
            target: 'damaged-unit',
            operation: {
              kind: 'defeat',
            },
          },
        ],
      },
    ],
  },
} as const satisfies UpgradeDefinition;
