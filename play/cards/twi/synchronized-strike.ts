import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteSynchronizedStrike = {
  cardId: 'synchronized-strike',
  name: 'Synchronized Strike',
  kind: 'event',
  aspects: ['Command', 'Heroism'],
  traits: ['Tactic'],
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
          kind: 'damage-target',
          target: 'chosen',
          amount: {
            kind: 'unit-count',
            filter: {
              controller: 'friendly',
              sameArenaAs: 'chosen',
            },
          },
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
