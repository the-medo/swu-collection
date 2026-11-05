import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteTacticalAdvantage = {
  cardId: 'tactical-advantage',
  name: 'Tactical Advantage',
  kind: 'event',
  aspects: ['Command'],
  traits: ['Tactic'],
  cost: 1,
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
            kind: 'modify',
            power: 2,
            hp: 2,
            duration: 'phase',
          },
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
