import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-foundations.json.
export const bb8HappyBeeps = {
  cardId: 'bb-8--happy-beeps',
  name: 'BB-8, Happy Beeps',
  kind: 'unit',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Resistance', 'Droid', 'Pilot'],
  unique: true,
  cost: 1,
  power: 1,
  hp: 4,
  arena: 'ground',
  piloting: [
    {
      id: 'piloting',
      cost: 1,
      aspects: ['Aggression', 'Heroism'],
    },
  ],
  upgrade: {
    attachTo: 'friendly-vehicle-without-pilot',
    modifiers: {
      power: 1,
      hp: 2,
    },
    triggers: [
      {
        id: 'ready-resistance',
        timing: 'played',
        effects: [
          {
            kind: 'pay',
            costs: [
              {
                kind: 'resources',
                amount: 2,
              },
            ],
            optional: true,
            effects: [
              {
                kind: 'select-unit',
                filter: {
                  trait: 'Resistance',
                },
                bind: 'chosen',
                optional: false,
                effects: [
                  {
                    kind: 'on-unit',
                    target: 'chosen',
                    operation: {
                      kind: 'ready',
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
} as const satisfies UnitDefinition;
