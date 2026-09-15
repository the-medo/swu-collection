import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-interactions.json.
export const closeTheShieldGate = {
  cardId: 'close-the-shield-gate',
  name: 'Close the Shield Gate',
  kind: 'event',
  aspects: ['Vigilance'],
  traits: ['Tactic'],
  cost: 1,
  effects: [
    {
      kind: 'select-target',
      bases: 'any',
      bind: 'base',
      optional: false,
      effects: [
        {
          kind: 'prevent-next-base-damage',
          target: 'base',
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
