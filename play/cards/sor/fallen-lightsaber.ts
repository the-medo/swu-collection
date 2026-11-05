import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteFallenLightsaber = {
  cardId: 'fallen-lightsaber',
  name: 'Fallen Lightsaber',
  kind: 'upgrade',
  aspects: ['Aggression', 'Villainy'],
  traits: ['Item', 'Weapon', 'Lightsaber'],
  cost: 3,
  token: false,
  modifiers: {
    power: 3,
    hp: 3,
  },
  attachTo: 'non-vehicle',
  grantsIf: {
    trait: 'Force',
  },
  grants: {
    triggers: [
      {
        id: 'attack',
        timing: 'attack',
        effects: [
          {
            kind: 'damage-units',
            amount: 1,
            filter: {
              controller: 'enemy',
              arena: 'ground',
            },
          },
        ],
      },
    ],
  },
} as const satisfies UpgradeDefinition;
