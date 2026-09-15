import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-effects.json.
export const goIntoHiding = {
  cardId: 'go-into-hiding',
  name: 'Go Into Hiding',
  kind: 'event',
  aspects: [],
  traits: ['Tactic'],
  cost: 2,
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
            power: 0,
            hp: 0,
            duration: 'phase',
            cannotBeAttacked: true,
          },
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
