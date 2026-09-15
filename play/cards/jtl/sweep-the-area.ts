import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-conversions.json.
export const sweepTheArea = {
  cardId: 'sweep-the-area',
  name: 'Sweep the Area',
  kind: 'event',
  aspects: ['Cunning'],
  traits: ['Tactic'],
  cost: 3,
  effects: [
    {
      kind: 'select-unit',
      filter: {
        nonLeader: true,
        maxCost: 3,
      },
      bind: 'first',
      optional: true,
      effects: [
        {
          kind: 'select-unit',
          filter: {
            nonLeader: true,
            sameArenaAs: 'first',
            otherThan: 'first',
            maxCost: {
              kind: 'difference',
              left: 3,
              right: {
                kind: 'card-cost',
                target: 'first',
              },
            },
          },
          bind: 'second',
          optional: true,
          otherwise: [
            {
              kind: 'return-bound',
              targets: ['first'],
            },
          ],
          effects: [
            {
              kind: 'return-bound',
              targets: ['first', 'second'],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
