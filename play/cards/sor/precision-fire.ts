import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompletePrecisionFire = {
  cardId: 'precision-fire',
  name: 'Precision Fire',
  kind: 'event',
  aspects: ['Aggression'],
  traits: ['Tactic'],
  cost: 1,
  effects: [
    {
      kind: 'select-unit',
      filter: {
        controller: 'friendly',
      },
      optional: false,
      bind: 'chosen',
      effects: [
        {
          kind: 'attack-bound',
          target: 'chosen',
          optional: false,
          powerBonus: {
            kind: 'conditional',
            condition: {
              kind: 'unit-matches',
              target: 'chosen',
              filter: {
                trait: 'Trooper',
              },
            },
            then: 2,
            otherwise: 0,
          },
          abilities: {
            keywords: ['Saboteur'],
          },
        },
      ],
      forAttack: {},
    },
  ],
} as const satisfies EventDefinition;
