import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-effects.json.
export const dengarCrudeAndSlovenly = {
  cardId: 'dengar--crude-and-slovenly',
  name: 'Dengar, Crude and Slovenly',
  kind: 'unit',
  aspects: ['Aggression', 'Villainy'],
  traits: ['Underworld', 'Bounty Hunter', 'Pilot'],
  unique: true,
  cost: 4,
  power: 5,
  hp: 4,
  arena: 'ground',
  piloting: [
    {
      id: 'piloting',
      cost: 2,
      aspects: ['Aggression', 'Villainy'],
    },
  ],
  upgrade: {
    attachTo: 'friendly-vehicle-without-pilot',
    modifiers: {
      power: 1,
      hp: 2,
    },
    grants: {
      triggers: [
        {
          id: 'indirect-hunt',
          timing: 'attack',
          effects: [
            {
              kind: 'indirect-damage',
              recipient: 'chosen',
              amount: {
                kind: 'conditional',
                condition: {
                  kind: 'unit-matches',
                  target: 'source',
                  filter: {
                    trait: 'Underworld',
                  },
                },
                then: 3,
                otherwise: 2,
              },
            },
          ],
        },
      ],
    },
  },
} as const satisfies UnitDefinition;
