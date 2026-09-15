import type { EventDefinition } from '../definition.ts';

// JTL 106. Printed text is pinned in meta-board fixture.
export const unityOfPurpose = {
  cardId: 'unity-of-purpose',
  name: 'Unity of Purpose',
  kind: 'event',
  aspects: ['Command', 'Command'],
  traits: ['Plan'],
  cost: 6,
  effects: [
    {
      kind: 'with-value',
      name: 'names',
      value: {
        kind: 'unit-count',
        filter: {
          controller: 'friendly',
        },
        distinctNames: true,
      },
      effects: [
        {
          kind: 'modify-units',
          filter: {
            controller: 'friendly',
          },
          operation: {
            kind: 'modify',
            power: {
              kind: 'value',
              name: 'names',
            },
            hp: {
              kind: 'value',
              name: 'names',
            },
            duration: 'phase',
          },
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
