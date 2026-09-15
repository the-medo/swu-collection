import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-history.json.
export const betrayedTrust = {
  cardId: 'betrayed-trust',
  name: 'Betrayed Trust',
  kind: 'event',
  aspects: ['Vigilance'],
  traits: ['Trick'],
  cost: 2,
  effects: [
    {
      kind: 'select-unit',
      filter: {
        controller: 'enemy',
      },
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
            cannotDealCombatDamage: true,
          },
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
