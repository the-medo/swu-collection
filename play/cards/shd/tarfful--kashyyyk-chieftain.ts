import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteTarffulKashyyykChieftain = {
  cardId: 'tarfful--kashyyyk-chieftain',
  name: 'Tarfful, Kashyyyk Chieftain',
  kind: 'unit',
  aspects: ['Heroism'],
  traits: ['Wookiee'],
  cost: 7,
  unique: true,
  power: 3,
  hp: 9,
  arena: 'ground',
  restore: 2,
  triggers: [
    {
      id: 'friendly-damage-survived',
      timing: 'friendly-damage-survived',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'enemy',
            arena: 'ground',
          },
          optional: false,
          bind: 'chosen',
          effects: [
            {
              kind: 'damage-target',
              target: 'chosen',
              amount: {
                kind: 'value',
                name: 'damage',
              },
              source: 'subject',
            },
          ],
        },
      ],
      condition: {
        kind: 'all',
        conditions: [
          {
            kind: 'unit-matches',
            target: 'subject',
            filter: {
              trait: 'Wookiee',
            },
          },
          {
            kind: 'numeric-at-least',
            value: {
              kind: 'value',
              name: 'combat',
            },
            amount: 1,
          },
        ],
      },
    },
  ],
} as const satisfies UnitDefinition;
