import type { UnitDefinition } from '../definition.ts';

// Printed text and rulings are pinned in the meta-post-search fixture.
export const jabbaTheHuttEminenceOfTatooine = {
  cardId: 'jabba-the-hutt--eminence-of-tatooine',
  name: 'Jabba the Hutt, Eminence of Tatooine',
  aspects: ['Cunning', 'Vigilance', 'Villainy'],
  traits: ['Underworld', 'Hutt'],
  cost: 4,
  kind: 'unit',
  power: 2,
  hp: 6,
  arena: 'ground',
  unique: true,
  restore: 2,
  triggers: [
    {
      id: 'return-upgrade',
      timing: 'played',
      effects: [
        {
          kind: 'select-upgrades',
          filter: {},
          min: 0,
          max: 1,
          bind: 'returned',
          effects: [
            {
              kind: 'move-upgrades',
              group: 'returned',
              to: 'hand',
              effects: [
                {
                  kind: 'play-card',
                  from: 'hand',
                  target: 'returned',
                  filter: {},
                  free: true,
                  optional: true,
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
