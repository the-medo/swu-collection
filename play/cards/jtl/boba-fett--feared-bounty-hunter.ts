import type { UnitDefinition } from '../definition.ts';

// Printed text and rulings are pinned in the meta-prevention fixture.
export const bobaFettFearedBountyHunter = {
  cardId: 'boba-fett--feared-bounty-hunter',
  name: 'Boba Fett, Feared Bounty Hunter',
  kind: 'unit',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Underworld', 'Bounty Hunter', 'Pilot'],
  cost: 5,
  power: 5,
  hp: 4,
  arena: 'ground',
  unique: true,
  keywords: ['Shielded'],
  piloting: [
    {
      id: 'pilot',
      cost: 2,
      aspects: ['Cunning', 'Villainy'],
    },
  ],
  upgrade: {
    modifiers: {
      power: 2,
      hp: 3,
    },
    attachTo: 'friendly-vehicle-without-pilot',
    triggers: [
      {
        id: 'pilot-damage',
        timing: 'played',
        effects: [
          {
            kind: 'if',
            condition: {
              kind: 'unit-matches',
              target: 'attached',
              filter: {
                trait: 'Transport',
              },
            },
            effects: [
              {
                kind: 'choose-mode',
                options: [
                  {
                    id: 'one',
                    effects: [
                      {
                        kind: 'damage-unit',
                        amount: 1,
                        arena: 'any',
                        optional: true,
                      },
                    ],
                  },
                  {
                    id: 'two',
                    effects: [
                      {
                        kind: 'damage-unit',
                        amount: 2,
                        arena: 'any',
                        optional: true,
                      },
                    ],
                  },
                ],
              },
            ],
            otherwise: [
              {
                kind: 'damage-unit',
                amount: 1,
                arena: 'any',
                optional: true,
              },
            ],
          },
        ],
      },
    ],
  },
} as const satisfies UnitDefinition;
