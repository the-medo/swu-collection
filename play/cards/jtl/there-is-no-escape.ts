import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-foundations.json.
export const thereIsNoEscape = {
  cardId: 'there-is-no-escape',
  name: 'There Is No Escape',
  kind: 'event',
  aspects: ['Villainy'],
  traits: ['Tactic'],
  cost: 2,
  effects: [
    {
      kind: 'select-units',
      filter: {},
      min: 0,
      max: 3,
      bind: 'blanked',
      effects: [
        {
          kind: 'modify-units',
          filter: {
            inGroup: 'blanked',
          },
          operation: {
            kind: 'modify',
            power: 0,
            hp: 0,
            duration: 'round',
            loseAbilities: true,
          },
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
