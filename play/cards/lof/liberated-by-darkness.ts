import type { EventDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 control and timing fixture.
export const liberatedByDarkness = {
  cardId: 'liberated-by-darkness',
  name: 'Liberated by Darkness',
  kind: 'event',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Force'],
  cost: 5,
  effects: [
    {
      kind: 'pay',
      costs: [
        {
          kind: 'force',
        },
      ],
      optional: false,
      effects: [
        {
          kind: 'select-unit',
          filter: {
            nonLeader: true,
          },
          optional: false,
          bind: 'chosen',
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'take-control',
                player: 'self',
                returnWhen: 'regroup',
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
