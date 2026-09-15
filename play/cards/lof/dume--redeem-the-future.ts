import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-effects.json.
export const dumeRedeemTheFuture = {
  cardId: 'dume--redeem-the-future',
  name: 'Dume, Redeem the Future',
  kind: 'unit',
  aspects: ['Vigilance', 'Vigilance'],
  traits: ['Force', 'Creature'],
  unique: true,
  cost: 4,
  power: 2,
  hp: 7,
  arena: 'ground',
  triggers: [
    {
      id: 'regroup-experience',
      timing: 'regroup-start',
      effects: [
        {
          kind: 'each-unit',
          filter: {
            controller: 'friendly',
            otherThan: 'source',
            withoutTrait: 'Vehicle',
          },
          bind: 'chosen',
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'give-token',
                token: 'experience',
                count: 1,
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
