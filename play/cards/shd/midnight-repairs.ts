import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteMidnightRepairs = {
  cardId: 'midnight-repairs',
  name: 'Midnight Repairs',
  kind: 'event',
  aspects: ['Vigilance', 'Vigilance'],
  traits: ['Tactic'],
  cost: 2,
  effects: [
    {
      kind: 'distribute',
      benefit: 'heal',
      amount: 8,
      filter: {},
      bind: 'healed',
      effects: [],
    },
  ],
} as const satisfies EventDefinition;
