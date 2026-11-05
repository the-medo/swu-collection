import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteTheForceIsWithMe = {
  cardId: 'the-force-is-with-me',
  name: 'The Force Is With Me',
  kind: 'event',
  aspects: ['Heroism', 'Vigilance'],
  traits: ['Force'],
  cost: 4,
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
          kind: 'on-unit',
          target: 'chosen',
          operation: {
            kind: 'give-token',
            token: 'experience',
            count: 2,
          },
        },
        {
          kind: 'if',
          condition: {
            kind: 'units-at-least',
            filter: {
              controller: 'friendly',
              trait: 'Force',
            },
            amount: 1,
          },
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'give-token',
                token: 'shield',
                count: 1,
              },
            },
          ],
        },
        {
          kind: 'attack-bound',
          target: 'chosen',
          optional: true,
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
