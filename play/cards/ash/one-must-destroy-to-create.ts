import type { EventDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 effects fixture.
export const oneMustDestroyToCreate = {
  cardId: 'one-must-destroy-to-create',
  name: 'One Must Destroy to Create',
  kind: 'event',
  aspects: ['Villainy'],
  traits: ['Plan'],
  cost: 3,
  effects: [
    {
      kind: 'select-unit',
      filter: {
        controller: 'friendly',
        nonLeader: true,
      },
      bind: 'chosen',
      optional: false,
      effects: [
        {
          kind: 'on-unit',
          target: 'chosen',
          operation: {
            kind: 'defeat',
          },
        },
        {
          kind: 'play-card',
          target: 'chosen',
          from: 'discard',
          filter: {
            kind: 'unit',
          },
          free: true,
          optional: true,
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
