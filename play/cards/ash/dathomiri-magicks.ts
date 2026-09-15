import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-advanced.json.
export const dathomiriMagicks = {
  cardId: 'dathomiri-magicks',
  name: 'Dathomiri Magicks',
  kind: 'event',
  aspects: ['Command', 'Villainy'],
  traits: ['Force'],
  cost: 6,
  costReductions: [
    {
      condition: {
        kind: 'units-at-least',
        filter: {
          controller: 'friendly',
          trait: 'Force',
        },
        amount: 1,
      },
      amount: 1,
    },
  ],
  effects: [
    {
      kind: 'play-card',
      from: 'discard',
      filter: {
        kind: 'unit',
        withoutTrait: 'Vehicle',
        maxCost: 2,
      },
      free: true,
      optional: true,
      effects: [
        {
          kind: 'play-card',
          from: 'discard',
          filter: {
            kind: 'unit',
            withoutTrait: 'Vehicle',
            maxCost: 2,
          },
          free: true,
          optional: true,
          effects: [
            {
              kind: 'play-card',
              from: 'discard',
              filter: {
                kind: 'unit',
                withoutTrait: 'Vehicle',
                maxCost: 2,
              },
              free: true,
              optional: true,
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
