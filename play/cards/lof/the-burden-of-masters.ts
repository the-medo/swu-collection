import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-effects.json.
export const theBurdenOfMasters = {
  cardId: 'the-burden-of-masters',
  name: 'The Burden of Masters',
  kind: 'event',
  aspects: ['Command'],
  traits: ['Learned'],
  cost: 1,
  effects: [
    {
      kind: 'inspect-zone',
      zone: 'discard',
      player: 'self',
      chooser: 'self',
      filter: {
        kind: 'unit',
        trait: 'Force',
      },
      min: 1,
      max: 1,
      bind: 'returned',
      effects: [
        {
          kind: 'move-card',
          target: 'returned',
          from: 'discard',
          to: 'deck-bottom',
          effects: [
            {
              kind: 'play-card',
              from: 'hand',
              filter: {
                kind: 'unit',
              },
              optional: false,
              bind: 'played',
              effects: [
                {
                  kind: 'on-unit',
                  target: 'played',
                  operation: {
                    kind: 'give-token',
                    token: 'experience',
                    count: 2,
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
