import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-foundations.json.
export const earlySetMomentOfGlory = {
  cardId: 'moment-of-glory',
  name: 'Moment of Glory',
  kind: 'event',
  aspects: ['Command'],
  traits: ['Tactic'],
  cost: 3,
  effects: [
    {
      kind: 'select-unit',
      filter: {},
      bind: 'chosen',
      optional: false,
      effects: [
        {
          kind: 'on-unit',
          target: 'chosen',
          operation: {
            kind: 'modify',
            power: 4,
            hp: 4,
            duration: 'phase',
          },
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
