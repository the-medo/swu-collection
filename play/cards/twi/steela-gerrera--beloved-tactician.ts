import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteSteelaGerreraBelovedTactician = {
  cardId: 'steela-gerrera--beloved-tactician',
  name: 'Steela Gerrera, Beloved Tactician',
  kind: 'unit',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Fringe'],
  cost: 4,
  unique: true,
  power: 4,
  hp: 3,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'choose-mode',
          options: [
            {
              id: 'resolve',
              effects: [
                {
                  kind: 'damage-own-base',
                  amount: 2,
                },
                {
                  kind: 'search-deck',
                  count: 8,
                  max: 1,
                  filter: 'any',
                  trait: 'Tactic',
                },
              ],
            },
            {
              id: 'decline',
              effects: [],
            },
          ],
        },
      ],
    },
    {
      id: 'defeated',
      timing: 'defeated',
      effects: [
        {
          kind: 'choose-mode',
          options: [
            {
              id: 'resolve',
              effects: [
                {
                  kind: 'damage-own-base',
                  amount: 2,
                },
                {
                  kind: 'search-deck',
                  count: 8,
                  max: 1,
                  filter: 'any',
                  trait: 'Tactic',
                },
              ],
            },
            {
              id: 'decline',
              effects: [],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
