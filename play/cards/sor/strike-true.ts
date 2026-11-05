import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteStrikeTrue = {
  cardId: 'strike-true',
  name: 'Strike True',
  kind: 'event',
  aspects: ['Command'],
  traits: ['Tactic'],
  cost: 3,
  effects: [
    {
      kind: 'select-unit',
      filter: {
        controller: 'friendly',
      },
      optional: false,
      bind: 'chosen',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'enemy',
          },
          optional: false,
          bind: 'victim',
          effects: [
            {
              kind: 'damage-target',
              target: 'victim',
              amount: {
                kind: 'unit-stat',
                target: 'chosen',
                stat: 'power',
              },
              source: 'chosen',
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
