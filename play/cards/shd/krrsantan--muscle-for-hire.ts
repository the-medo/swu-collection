import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteKrrsantanMuscleForHire = {
  cardId: 'krrsantan--muscle-for-hire',
  name: 'Krrsantan, Muscle for Hire',
  kind: 'unit',
  aspects: ['Villainy', 'Aggression'],
  traits: ['Underworld', 'Wookiee', 'Bounty Hunter'],
  cost: 5,
  unique: true,
  power: 3,
  hp: 7,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'units-at-least',
            filter: {
              controller: 'enemy',
              hasBounty: true,
            },
            amount: 1,
          },
          effects: [
            {
              kind: 'choose-mode',
              options: [
                {
                  id: 'resolve',
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
                {
                  id: 'decline',
                  effects: [],
                },
              ],
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
          filter: {
            arena: 'ground',
          },
          optional: false,
          bind: 'chosen',
          effects: [
            {
              kind: 'choose-mode',
              options: [
                {
                  id: 'resolve',
                  effects: [
                    {
                      kind: 'damage-target',
                      target: 'chosen',
                      amount: {
                        kind: 'unit-stat',
                        target: 'source',
                        stat: 'damage',
                      },
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
    },
  ],
} as const satisfies UnitDefinition;
