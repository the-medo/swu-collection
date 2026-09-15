import type { EventDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 damage replacement fixture.
export const theTragedyOfPlagueis = {
  cardId: 'the-tragedy-of-plagueis',
  name: 'The Tragedy of Plagueis',
  kind: 'event',
  aspects: ['Vigilance', 'Villainy'],
  traits: ['Learned'],
  cost: 5,
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
          kind: 'on-unit',
          target: 'chosen',
          operation: {
            kind: 'modify',
            power: 0,
            hp: 0,
            duration: 'phase',
            surviveZeroHp: true,
          },
        },
      ],
      allowMissing: true,
    },
    {
      kind: 'select-unit',
      filter: {
        controller: 'enemy',
      },
      optional: false,
      bind: 'chosen',
      effects: [
        {
          kind: 'on-unit',
          target: 'chosen',
          operation: {
            kind: 'defeat',
          },
        },
      ],
      chooser: 'enemy',
      allowMissing: true,
    },
  ],
} as const satisfies EventDefinition;
