import type { EventDefinition } from '../definition.ts';

// LAW 208. Printed text is pinned in meta-board fixture.
export const collateralDamage = {
  cardId: 'collateral-damage',
  name: 'Collateral Damage',
  kind: 'event',
  aspects: ['Aggression'],
  traits: ['Disaster'],
  cost: 3,
  effects: [
    {
      kind: 'select-unit',
      bind: 'first',
      filter: {},
      optional: false,
      effects: [
        {
          kind: 'on-unit',
          target: 'first',
          operation: {
            kind: 'damage',
            amount: 2,
          },
        },
        {
          kind: 'select-target',
          units: {
            sameArenaAs: 'first',
            otherThan: 'first',
          },
          bases: 'any',
          bind: 'damage-target',
          optional: false,
          effects: [
            {
              kind: 'damage-target',
              target: 'damage-target',
              amount: 2,
            },
          ],
        },
      ],
      allowMissing: true,
    },
  ],
} as const satisfies EventDefinition;
