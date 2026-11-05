import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-foundations.json.
export const earlySetDaringRaid = {
  cardId: 'daring-raid',
  name: 'Daring Raid',
  kind: 'event',
  aspects: ['Aggression'],
  traits: ['Tactic'],
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
          kind: 'damage-target',
          target: 'chosen',
          amount: 2,
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
