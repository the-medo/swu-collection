import type { EventDefinition } from '../definition.ts';

// Reprinted in IC27 030; identity and text follow the official catalog.
export const ic27ReprintLethalCrackdown = {
  cardId: 'lethal-crackdown',
  name: 'Lethal Crackdown',
  kind: 'event',
  aspects: ['Vigilance', 'Villainy'],
  traits: ['Tactic'],
  cost: 4,
  effects: [
    {
      kind: 'select-unit',
      filter: {
        nonLeader: true,
      },
      bind: 'chosen',
      optional: false,
      effects: [
        {
          kind: 'with-value',
          name: 'power',
          value: {
            kind: 'unit-stat',
            target: 'chosen',
            stat: 'power',
          },
          effects: [
            {
              kind: 'defeat-target',
              target: 'chosen',
            },
            {
              kind: 'damage-own-base',
              amount: {
                kind: 'value',
                name: 'power',
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
