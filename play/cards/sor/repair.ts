import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-foundations.json.
export const repair = {
  cardId: 'repair',
  name: 'Repair',
  kind: 'event',
  aspects: ['Vigilance'],
  traits: ['Supply'],
  cost: 1,
  effects: [
    {
      kind: 'select-target',
      units: {},
      bases: 'any',
      bind: 'chosen',
      optional: false,
      effects: [
        {
          kind: 'heal-target',
          target: 'chosen',
          amount: 3,
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
