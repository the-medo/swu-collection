import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteEmboStoicAndResolute = {
  cardId: 'embo--stoic-and-resolute',
  name: 'Embo, Stoic and Resolute',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Underworld', 'Bounty Hunter'],
  cost: 3,
  unique: true,
  power: 3,
  hp: 4,
  arena: 'ground',
  triggers: [
    {
      id: 'attack-ended',
      timing: 'attack-ended',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'unit-defeated',
            target: 'defender',
          },
          effects: [
            {
              kind: 'select-unit',
              filter: {},
              optional: false,
              bind: 'chosen',
              effects: [
                {
                  kind: 'distribute',
                  benefit: 'heal',
                  amount: 2,
                  filter: {
                    sameAs: 'chosen',
                  },
                  bind: 'healed',
                  effects: [],
                },
              ],
            },
          ],
        },
      ],
      condition: {
        kind: 'value-at-least',
        name: 'survived',
        amount: 1,
      },
    },
  ],
} as const satisfies UnitDefinition;
