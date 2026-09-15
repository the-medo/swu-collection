import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-effects.json.
export const corruptedSaber = {
  cardId: 'corrupted-saber',
  name: 'Corrupted Saber',
  kind: 'upgrade',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Item', 'Weapon', 'Lightsaber'],
  cost: 2,
  token: false,
  modifiers: {
    power: 2,
    hp: 1,
  },
  attachTo: 'non-vehicle',
  grantsIf: {
    trait: 'Force',
  },
  grants: {
    triggers: [
      {
        id: 'weaken-defender',
        timing: 'attack',
        effects: [
          {
            kind: 'on-unit',
            target: 'defender',
            operation: {
              kind: 'modify',
              power: -2,
              hp: 0,
              duration: 'attack',
            },
          },
        ],
      },
    ],
  },
} as const satisfies UpgradeDefinition;
