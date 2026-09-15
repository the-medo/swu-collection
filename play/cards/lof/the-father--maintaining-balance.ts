import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-effects.json.
export const theFatherMaintainingBalance = {
  cardId: 'the-father--maintaining-balance',
  name: 'The Father, Maintaining Balance',
  kind: 'unit',
  aspects: [],
  traits: ['Force'],
  unique: true,
  cost: 8,
  power: 5,
  hp: 10,
  arena: 'ground',
  triggers: [
    {
      id: 'renew-the-force',
      timing: 'force-used',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            sameAs: 'source',
          },
          bind: 'chosen',
          optional: true,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'damage',
                amount: 1,
              },
              ifYouDo: [
                {
                  kind: 'gain-force',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
