import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 attack mechanics fixture.
export const babuFrikHeyyy = {
  cardId: 'babu-frik--heyyy-',
  name: 'Babu Frik, Heyyy!',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Underworld'],
  unique: true,
  cost: 1,
  power: 1,
  hp: 4,
  arena: 'ground',
  actions: [
    {
      id: 'droid-attack',
      costs: [
        {
          kind: 'exhaust-self',
        },
      ],
      limit: null,
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'friendly',
            trait: 'Droid',
          },
          optional: true,
          bind: 'chosen',
          effects: [
            {
              kind: 'attack-bound',
              target: 'chosen',
              optional: false,
              damageStat: 'remaining-hp',
            },
          ],
          forAttack: {},
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
