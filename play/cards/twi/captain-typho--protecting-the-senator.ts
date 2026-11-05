import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteCaptainTyphoProtectingTheSenator = {
  cardId: 'captain-typho--protecting-the-senator',
  name: 'Captain Typho, Protecting the Senator',
  kind: 'unit',
  aspects: ['Vigilance', 'Heroism'],
  traits: ['Naboo', 'Republic', 'Trooper'],
  cost: 3,
  unique: true,
  power: 2,
  hp: 4,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {},
          optional: false,
          bind: 'chosen',
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'modify',
                power: 0,
                hp: 0,
                duration: 'phase',
                abilities: {
                  keywords: ['Sentinel'],
                },
              },
            },
          ],
        },
      ],
    },
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'select-unit',
          filter: {},
          optional: false,
          bind: 'chosen',
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'modify',
                power: 0,
                hp: 0,
                duration: 'phase',
                abilities: {
                  keywords: ['Sentinel'],
                },
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
