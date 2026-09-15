import type { EventDefinition } from '../definition.ts';

// Official identity and printed text are pinned in testing/fixtures/ibh.json.
export const youHaveFailedMe = {
  cardId: 'you-have-failed-me',
  name: 'You Have Failed Me',
  kind: 'event',
  aspects: ['Aggression', 'Villainy'],
  traits: ['Tactic'],
  cost: 4,
  effects: [
    {
      kind: 'select-unit',
      filter: { controller: 'friendly' },
      bind: 'sacrifice',
      optional: false,
      effects: [
        {
          kind: 'on-unit',
          target: 'sacrifice',
          operation: { kind: 'defeat' },
          ifYouDo: [
            {
              kind: 'select-unit',
              filter: { controller: 'friendly', powerAtMost: 5 },
              bind: 'chosen',
              optional: false,
              effects: [{ kind: 'on-unit', target: 'chosen', operation: { kind: 'ready' } }],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
