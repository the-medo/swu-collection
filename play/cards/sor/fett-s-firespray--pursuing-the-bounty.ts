import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteFettSFiresprayPursuingTheBounty = {
  cardId: 'fett-s-firespray--pursuing-the-bounty',
  name: "Fett's Firespray, Pursuing the Bounty",
  kind: 'unit',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Underworld', 'Vehicle', 'Transport'],
  cost: 6,
  unique: true,
  power: 5,
  hp: 6,
  arena: 'space',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'any',
            conditions: [
              {
                kind: 'controls-name',
                name: 'Boba Fett',
              },
              {
                kind: 'controls-name',
                name: 'Jango Fett',
              },
            ],
          },
          effects: [
            {
              kind: 'on-unit',
              target: 'source',
              operation: {
                kind: 'ready',
              },
            },
          ],
        },
      ],
    },
  ],
  actions: [
    {
      id: 'action',
      costs: [
        {
          kind: 'resources',
          amount: 2,
        },
      ],
      limit: null,
      effects: [
        {
          kind: 'select-unit',
          filter: {
            unique: false,
          },
          optional: false,
          bind: 'chosen',
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'exhaust',
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
