import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-effects.json.
export const focusFire = {
  cardId: 'focus-fire',
  name: 'Focus Fire',
  kind: 'event',
  aspects: ['Command'],
  traits: ['Tactic'],
  cost: 4,
  effects: [
    {
      kind: 'select-unit',
      filter: {},
      bind: 'chosen',
      optional: false,
      effects: [
        {
          kind: 'units-damage-target',
          target: 'chosen',
          filter: {
            controller: 'friendly',
            trait: 'Vehicle',
            sameArenaAs: 'chosen',
          },
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
