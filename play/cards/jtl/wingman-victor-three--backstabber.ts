import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-foundations.json.
export const wingmanVictorThreeBackstabber = {
  cardId: 'wingman-victor-three--backstabber',
  name: 'Wingman Victor Three, Backstabber',
  kind: 'unit',
  aspects: ['Command', 'Villainy'],
  traits: ['Imperial', 'Pilot'],
  unique: true,
  cost: 3,
  power: 4,
  hp: 3,
  arena: 'ground',
  piloting: [
    {
      id: 'piloting',
      cost: 1,
      aspects: ['Command', 'Villainy'],
    },
  ],
  upgrade: {
    attachTo: 'friendly-vehicle-without-pilot',
    modifiers: {
      power: 1,
      hp: 1,
    },
    triggers: [
      {
        id: 'experience-other-unit',
        timing: 'played',
        effects: [
          {
            kind: 'select-unit',
            filter: {
              otherThan: 'attached',
            },
            bind: 'chosen',
            optional: true,
            effects: [
              {
                kind: 'on-unit',
                target: 'chosen',
                operation: {
                  kind: 'give-token',
                  token: 'experience',
                  count: 1,
                },
              },
            ],
          },
        ],
      },
    ],
  },
} as const satisfies UnitDefinition;
