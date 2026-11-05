import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteJediLightsaber = {
  cardId: 'jedi-lightsaber',
  name: 'Jedi Lightsaber',
  kind: 'upgrade',
  aspects: ['Heroism', 'Vigilance'],
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
            kind: 'on-unit',
            target: 'defender',
            operation: {
              kind: 'modify',
              power: -2,
              hp: -2,
              duration: 'phase',
            },
          },
        ],
      },
    ],
  },
} as const satisfies UpgradeDefinition;
