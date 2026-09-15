import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-effects.json.
export const darthMalakCovetousApprentice = {
  cardId: 'darth-malak--covetous-apprentice',
  name: 'Darth Malak, Covetous Apprentice',
  kind: 'unit',
  aspects: ['Villainy'],
  traits: ['Force', 'Sith'],
  unique: true,
  cost: 5,
  power: 4,
  hp: 7,
  arena: 'ground',
  keywords: ['Overwhelm'],
  triggers: [
    {
      id: 'when-played',
      timing: 'played',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'units-at-least',
            filter: {
              controller: 'friendly',
              trait: 'Sith',
              leader: true,
            },
            amount: 1,
          },
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
                    kind: 'ready',
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
