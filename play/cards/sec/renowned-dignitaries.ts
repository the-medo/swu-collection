import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-effects.json.
export const renownedDignitaries = {
  cardId: 'renowned-dignitaries',
  name: 'Renowned Dignitaries',
  kind: 'unit',
  aspects: ['Command', 'Heroism'],
  traits: ['New Republic', 'Official'],
  cost: 6,
  power: 5,
  hp: 6,
  arena: 'ground',
  keywords: ['Overwhelm'],
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'with-value',
          name: 'officials',
          value: {
            kind: 'unit-count',
            filter: {
              controller: 'friendly',
              trait: 'Official',
            },
          },
          effects: [
            {
              kind: 'heal-own-base',
              amount: {
                kind: 'value',
                name: 'officials',
                multiplier: 2,
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
