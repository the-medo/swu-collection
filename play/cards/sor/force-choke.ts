import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteForceChoke = {
  cardId: 'force-choke',
  name: 'Force Choke',
  kind: 'event',
  aspects: ['Aggression', 'Villainy'],
  traits: ['Force'],
  cost: 2,
  effects: [
    {
      kind: 'select-unit',
      filter: {
        withoutTrait: 'Vehicle',
      },
      optional: false,
      bind: 'chosen',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'unit-matches',
            target: 'chosen',
            filter: {
              controller: 'friendly',
            },
          },
          effects: [
            {
              kind: 'damage-target',
              target: 'chosen',
              amount: 5,
            },
            {
              kind: 'draw-cards',
              amount: 1,
            },
          ],
          otherwise: [
            {
              kind: 'damage-target',
              target: 'chosen',
              amount: 5,
            },
            {
              kind: 'draw-cards',
              amount: 1,
              player: 'enemy',
            },
          ],
        },
      ],
    },
  ],
  costReductions: [
    {
      condition: {
        kind: 'units-at-least',
        filter: {
          controller: 'friendly',
          trait: 'Force',
        },
        amount: 1,
      },
      amount: 1,
    },
  ],
} as const satisfies EventDefinition;
