import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteAsteroidSanctuary = {
  cardId: 'asteroid-sanctuary',
  name: 'Asteroid Sanctuary',
  kind: 'event',
  aspects: ['Cunning'],
  traits: ['Trick'],
  cost: 2,
  effects: [
    {
      kind: 'select-unit',
      filter: {
        controller: 'enemy',
      },
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
      ],
    },
    {
      kind: 'select-unit',
      filter: {
        controller: 'friendly',
        maxCost: 3,
      },
      optional: false,
      bind: 'chosen',
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
  ],
} as const satisfies EventDefinition;
