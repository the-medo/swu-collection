import type { UpgradeDefinition } from '../definition.ts';

// ASH 114. Printed text is pinned in meta-force-indirect fixture.
export const sabineSLightsaberNotAlone = {
  cardId: 'sabine-s-lightsaber--not-alone',
  name: "Sabine's Lightsaber, Not Alone",
  kind: 'upgrade',
  aspects: ['Command', 'Heroism'],
  traits: ['Item', 'Weapon', 'Lightsaber'],
  unique: true,
  cost: 2,
  token: false,
  modifiers: {
    power: 2,
    hp: 2,
  },
  attachTo: 'non-vehicle',
  grants: {
    constant: [
      {
        condition: {
          kind: 'any',
          conditions: [
            {
              kind: 'unit-matches',
              target: 'source',
              filter: {
                name: 'Sabine Wren',
              },
            },
            {
              kind: 'unit-matches',
              target: 'source',
              filter: {
                trait: 'Force',
              },
            },
          ],
        },
        abilities: {
          restore: 2,
        },
      },
    ],
  },
} as const satisfies UpgradeDefinition;
