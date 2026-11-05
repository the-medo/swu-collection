import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteBamboozle = {
  cardId: 'bamboozle',
  name: 'Bamboozle',
  kind: 'event',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Trick'],
  cost: 2,
  effects: [
    {
      kind: 'select-unit',
      filter: {},
      optional: false,
      bind: 'chosen',
      effects: [
        {
          kind: 'on-unit',
          target: 'chosen',
          operation: {
            kind: 'exhaust',
          },
        },
        {
          kind: 'select-upgrades',
          filter: {
            attachedTo: 'chosen',
          },
          min: 'all',
          max: 'all',
          bind: 'upgrades',
          effects: [
            {
              kind: 'move-upgrades',
              group: 'upgrades',
              to: 'hand',
            },
          ],
        },
      ],
    },
  ],
  alternateDiscardCost: {
    aspect: 'Cunning',
  },
} as const satisfies EventDefinition;
