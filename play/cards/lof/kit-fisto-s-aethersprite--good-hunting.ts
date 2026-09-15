import type { UnitDefinition } from '../definition.ts';

// LOF 147. Printed text is pinned in meta-movement fixture.
export const kitFistoSAetherspriteGoodHunting = {
  cardId: 'kit-fisto-s-aethersprite--good-hunting',
  name: "Kit Fisto's Aethersprite, Good Hunting",
  kind: 'unit',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Jedi', 'Republic', 'Vehicle', 'Fighter'],
  unique: true,
  cost: 5,
  power: 4,
  hp: 5,
  arena: 'space',
  keywords: ['Saboteur'],
  triggers: [
    {
      id: 'on-played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          bind: 'chosen',
          filter: {},
          optional: true,
          effects: [
            {
              kind: 'select-upgrades',
              filter: {
                attachedTo: 'chosen',
              },
              min: 0,
              max: 'all',
              bind: 'upgrades',
              effects: [
                {
                  kind: 'move-upgrades',
                  group: 'upgrades',
                  to: 'discard',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
