import type { UnitDefinition } from '../definition.ts';

// Printed text and rulings are pinned in the meta-aspect-abilities fixture.
export const enochSolemnServant = {
  cardId: 'enoch--solemn-servant',
  name: 'Enoch, Solemn Servant',
  kind: 'unit',
  aspects: ['Vigilance', 'Command', 'Villainy'],
  traits: ['Imperial', 'Trooper'],
  cost: 4,
  power: 4,
  hp: 5,
  arena: 'ground',
  unique: true,
  triggers: [
    {
      id: 'damage-for-reduction',
      timing: 'defeated',
      effects: [
        {
          kind: 'choose-mode',
          options: [
            {
              id: 'damage-0',
              effects: [
                {
                  kind: 'with-value',
                  name: 'before',
                  value: {
                    kind: 'own-base-damage',
                    divisor: 1,
                  },
                  effects: [
                    {
                      kind: 'damage-own-base',
                      amount: 0,
                    },
                    {
                      kind: 'next-play',
                      filter: {
                        kind: 'unit',
                      },
                      discount: {
                        kind: 'base-damage-increase',
                        since: 'before',
                        divisor: 2,
                      },
                    },
                  ],
                },
              ],
            },
            {
              id: 'damage-1',
              effects: [
                {
                  kind: 'with-value',
                  name: 'before',
                  value: {
                    kind: 'own-base-damage',
                    divisor: 1,
                  },
                  effects: [
                    {
                      kind: 'damage-own-base',
                      amount: 1,
                    },
                    {
                      kind: 'next-play',
                      filter: {
                        kind: 'unit',
                      },
                      discount: {
                        kind: 'base-damage-increase',
                        since: 'before',
                        divisor: 2,
                      },
                    },
                  ],
                },
              ],
            },
            {
              id: 'damage-2',
              effects: [
                {
                  kind: 'with-value',
                  name: 'before',
                  value: {
                    kind: 'own-base-damage',
                    divisor: 1,
                  },
                  effects: [
                    {
                      kind: 'damage-own-base',
                      amount: 2,
                    },
                    {
                      kind: 'next-play',
                      filter: {
                        kind: 'unit',
                      },
                      discount: {
                        kind: 'base-damage-increase',
                        since: 'before',
                        divisor: 2,
                      },
                    },
                  ],
                },
              ],
            },
            {
              id: 'damage-3',
              effects: [
                {
                  kind: 'with-value',
                  name: 'before',
                  value: {
                    kind: 'own-base-damage',
                    divisor: 1,
                  },
                  effects: [
                    {
                      kind: 'damage-own-base',
                      amount: 3,
                    },
                    {
                      kind: 'next-play',
                      filter: {
                        kind: 'unit',
                      },
                      discount: {
                        kind: 'base-damage-increase',
                        since: 'before',
                        divisor: 2,
                      },
                    },
                  ],
                },
              ],
            },
            {
              id: 'damage-4',
              effects: [
                {
                  kind: 'with-value',
                  name: 'before',
                  value: {
                    kind: 'own-base-damage',
                    divisor: 1,
                  },
                  effects: [
                    {
                      kind: 'damage-own-base',
                      amount: 4,
                    },
                    {
                      kind: 'next-play',
                      filter: {
                        kind: 'unit',
                      },
                      discount: {
                        kind: 'base-damage-increase',
                        since: 'before',
                        divisor: 2,
                      },
                    },
                  ],
                },
              ],
            },
            {
              id: 'damage-5',
              effects: [
                {
                  kind: 'with-value',
                  name: 'before',
                  value: {
                    kind: 'own-base-damage',
                    divisor: 1,
                  },
                  effects: [
                    {
                      kind: 'damage-own-base',
                      amount: 5,
                    },
                    {
                      kind: 'next-play',
                      filter: {
                        kind: 'unit',
                      },
                      discount: {
                        kind: 'base-damage-increase',
                        since: 'before',
                        divisor: 2,
                      },
                    },
                  ],
                },
              ],
            },
            {
              id: 'damage-6',
              effects: [
                {
                  kind: 'with-value',
                  name: 'before',
                  value: {
                    kind: 'own-base-damage',
                    divisor: 1,
                  },
                  effects: [
                    {
                      kind: 'damage-own-base',
                      amount: 6,
                    },
                    {
                      kind: 'next-play',
                      filter: {
                        kind: 'unit',
                      },
                      discount: {
                        kind: 'base-damage-increase',
                        since: 'before',
                        divisor: 2,
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
