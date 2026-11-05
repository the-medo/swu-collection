import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteToroCalicanAmbitiousUpstart = {
  cardId: 'toro-calican--ambitious-upstart',
  name: 'Toro Calican, Ambitious Upstart',
  kind: 'unit',
  aspects: ['Villainy'],
  traits: ['Bounty Hunter'],
  cost: 3,
  unique: true,
  power: 3,
  hp: 5,
  arena: 'ground',
  triggers: [
    {
      id: 'friendly-played',
      timing: 'friendly-played',
      effects: [
        {
          kind: 'on-unit',
          target: 'subject',
          operation: {
            kind: 'damage',
            amount: 1,
          },
          ifYouDo: [
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
      excludeSelf: true,
      limit: 'once-per-round',
      condition: {
        kind: 'card-matches',
        target: 'subject',
        filter: {
          trait: 'Bounty Hunter',
        },
      },
      optional: true,
    },
  ],
} as const satisfies UnitDefinition;
