import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteNoGoodToMeDead = {
  cardId: 'no-good-to-me-dead',
  name: 'No Good to Me Dead',
  kind: 'event',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Plan'],
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
          kind: 'on-unit',
          target: 'chosen',
          operation: {
            kind: 'modify',
            power: 0,
            hp: 0,
            duration: 'round',
            cannotReady: true,
          },
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
