import type { UpgradeDefinition } from '../definition.ts';

// ASH 066. Printed text is pinned in meta-force-indirect fixture.
export const lukeSJediLightsaberConstructedByHand = {
  cardId: 'luke-s-jedi-lightsaber--constructed-by-hand',
  name: "Luke's Jedi Lightsaber, Constructed by Hand",
  kind: 'upgrade',
  aspects: ['Vigilance', 'Heroism'],
  traits: ['Item', 'Weapon', 'Lightsaber'],
  unique: true,
  cost: 3,
  token: false,
  modifiers: {
    power: 3,
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
            name: 'Luke Skywalker',
          },
        },
        abilities: {
          keywords: ['Sentinel'],
        },
      },
    ],
  },
} as const satisfies UpgradeDefinition;
