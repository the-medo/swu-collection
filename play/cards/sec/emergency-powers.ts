import type { EventDefinition } from '../definition.ts';

// SEC 040. Printed text is pinned in meta-movement fixture.
export const emergencyPowers = {
  cardId: 'emergency-powers',
  name: 'Emergency Powers',
  kind: 'event',
  aspects: ['Vigilance', 'Villainy'],
  traits: ['Law'],
  cost: 1,
  effects: [
    {
      kind: 'select-unit',
      bind: 'chosen',
      filter: {
        nonLeader: true,
      },
      optional: false,
      effects: [
        {
          kind: 'select-resources',
          player: 'self',
          exhausted: false,
          min: 0,
          max: 'all',
          operation: 'exhaust',
          countAs: 'paid',
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'give-token',
                token: 'experience',
                count: {
                  kind: 'value',
                  name: 'paid',
                },
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
