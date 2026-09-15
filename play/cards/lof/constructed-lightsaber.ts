import type { UpgradeDefinition } from '../definition.ts';

// LOF 261. Printed text is pinned in meta-force-indirect fixture.
export const constructedLightsaber = {
  cardId: 'constructed-lightsaber',
  name: 'Constructed Lightsaber',
  kind: 'upgrade',
  aspects: [],
  traits: ['Item', 'Weapon', 'Lightsaber'],
  cost: 3,
  token: false,
  modifiers: {
    power: 2,
    hp: 3,
  },
  attachTo: 'unit',
  attachFilter: {
    trait: 'Force',
  },
  grants: {
    constant: [
      {
        condition: {
          kind: 'unit-matches',
          target: 'source',
          filter: {
            anyAspect: ['Heroism'],
          },
        },
        abilities: {
          restore: 2,
        },
      },
      {
        condition: {
          kind: 'unit-matches',
          target: 'source',
          filter: {
            anyAspect: ['Villainy'],
          },
        },
        abilities: {
          raid: 2,
        },
      },
      {
        condition: {
          kind: 'not',
          condition: {
            kind: 'unit-matches',
            target: 'source',
            filter: {
              anyAspect: ['Heroism', 'Villainy'],
            },
          },
        },
        abilities: {
          keywords: ['Sentinel'],
        },
      },
    ],
  },
} as const satisfies UpgradeDefinition;
