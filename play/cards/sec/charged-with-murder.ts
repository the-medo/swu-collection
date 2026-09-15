import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-effects.json.
export const chargedWithMurder = {
  cardId: 'charged-with-murder',
  name: 'Charged with Murder',
  kind: 'event',
  aspects: ['Vigilance'],
  traits: ['Law'],
  cost: 4,
  effects: [
    {
      kind: 'disclose',
      aspects: ['Vigilance', 'Vigilance'],
      effects: [
        {
          kind: 'defeat-unit',
          filter: {
            nonLeader: true,
            damaged: true,
          },
          optional: false,
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
