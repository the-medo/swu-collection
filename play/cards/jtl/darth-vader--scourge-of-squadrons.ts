import type { UnitDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 traits and choices fixture.
export const darthVaderScourgeOfSquadrons = {
  cardId: 'darth-vader--scourge-of-squadrons',
  name: 'Darth Vader, Scourge of Squadrons',
  kind: 'unit',
  aspects: ['Aggression', 'Villainy'],
  traits: ['Force', 'Imperial', 'Sith', 'Pilot'],
  unique: true,
  cost: 6,
  power: 7,
  hp: 7,
  arena: 'ground',
  piloting: [
    {
      id: 'piloting',
      cost: 3,
      aspects: ['Aggression', 'Villainy'],
    },
  ],
  upgrade: {
    attachTo: 'friendly-vehicle-without-pilot',
    modifiers: {
      power: 3,
      hp: 3,
    },
    grants: {
      triggers: [
        {
          id: 'damage-chain',
          timing: 'attack',
          effects: [
            {
              kind: 'select-unit',
              filter: {},
              optional: true,
              bind: 'chosen',
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'damage',
                    amount: 1,
                  },
                },
                {
                  kind: 'if',
                  condition: {
                    kind: 'unit-defeated',
                    target: 'chosen',
                  },
                  effects: [
                    {
                      kind: 'select-target',
                      units: {},
                      bases: 'any',
                      bind: 'second',
                      optional: true,
                      effects: [
                        {
                          kind: 'damage-target',
                          target: 'second',
                          amount: 1,
                        },
                      ],
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  },
} as const satisfies UnitDefinition;
