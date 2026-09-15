import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-effects.json.
export const longLiveTheEmpire = {
  cardId: 'long-live-the-empire',
  name: 'Long Live the Empire',
  kind: 'event',
  aspects: ['Command', 'Villainy'],
  traits: ['Imperial'],
  cost: 2,
  effects: [
    {
      kind: 'select-unit',
      filter: {
        controller: 'friendly',
        trait: 'Imperial',
      },
      optional: false,
      bind: 'chosen',
      effects: [
        {
          kind: 'on-unit',
          target: 'chosen',
          operation: {
            kind: 'defeat',
          },
          ifYouDo: [
            {
              kind: 'resource-top',
              optional: false,
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
