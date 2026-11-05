import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteLuminaraUnduliSoftSpokenMaster = {
  cardId: 'luminara-unduli--soft-spoken-master',
  name: 'Luminara Unduli, Soft-Spoken Master',
  kind: 'unit',
  aspects: ['Vigilance', 'Heroism'],
  traits: ['Force', 'Jedi', 'Republic'],
  cost: 7,
  unique: true,
  power: 4,
  hp: 9,
  arena: 'ground',
  keywords: ['Coordinate'],
  constant: [
    {
      condition: {
        kind: 'units-at-least',
        filter: {
          controller: 'friendly',
        },
        amount: 3,
      },
      abilities: {
        keywords: ['Grit'],
      },
    },
  ],
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-target',
          bases: 'any',
          bind: 'chosen',
          optional: false,
          effects: [
            {
              kind: 'heal-target',
              target: 'chosen',
              amount: {
                kind: 'unit-count',
                filter: {
                  controller: 'friendly',
                },
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
