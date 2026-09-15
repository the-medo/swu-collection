import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-foundations.json.
export const inquisitorSLightsaber = {
  cardId: 'inquisitor-s-lightsaber',
  name: "Inquisitor's Lightsaber",
  kind: 'upgrade',
  aspects: ['Command', 'Villainy'],
  traits: ['Item', 'Weapon', 'Lightsaber'],
  cost: 2,
  token: false,
  modifiers: {
    power: 1,
    hp: 3,
  },
  attachTo: 'non-vehicle',
  grants: {
    constant: [
      {
        condition: {
          kind: 'unit-matches',
          target: 'source',
          filter: {
            attackingAgainst: {
              trait: 'Force',
            },
          },
        },
        power: 2,
      },
    ],
  },
} as const satisfies UpgradeDefinition;
