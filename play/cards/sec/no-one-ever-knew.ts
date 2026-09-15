import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-effects.json.
export const noOneEverKnew = {
  cardId: 'no-one-ever-knew',
  name: 'No One Ever Knew',
  kind: 'event',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Trick'],
  cost: 2,
  effects: [
    {
      kind: 'select-units',
      filter: {
        controller: 'enemy',
      },
      bind: 'targets',
      min: {
        kind: 'unit-count',
        filter: {
          controller: 'friendly',
          trait: 'Official',
        },
      },
      max: {
        kind: 'unit-count',
        filter: {
          controller: 'friendly',
          trait: 'Official',
        },
      },
      effects: [
        {
          kind: 'exhaust-group',
          group: 'targets',
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
