import type { LeaderDefinition } from '../definition.ts';
// The enemy chooses whether to deal damage. Preventing that chosen damage does
// not make the leader's controller draw a card (official clarification).
export const dedraMeeroNotWastingTime = {
  cardId: 'dedra-meero--not-wasting-time',
  name: 'Dedra Meero, Not Wasting Time',
  kind: 'leader',
  printedCost: 4,
  aspects: ['Aggression', 'Villainy'],
  traits: ['Imperial', 'Official'],
  faces: {
    leader: {
      actions: [
        {
          id: 'interrogate',
          costs: [{ kind: 'resources', amount: 1 }, { kind: 'exhaust-self' }],
          limit: null,
          effects: [
            {
              kind: 'select-unit',
              filter: { controller: 'enemy' },
              bind: 'unit',
              optional: false,
              effects: [
                {
                  kind: 'choose-mode',
                  chooserOf: 'unit',
                  options: [
                    {
                      id: 'take-2-damage',
                      effects: [
                        {
                          kind: 'on-unit',
                          target: 'unit',
                          operation: { kind: 'damage', amount: 2 },
                        },
                      ],
                    },
                    { id: 'opponent-draws', effects: [{ kind: 'draw-cards', amount: 1 }] },
                  ],
                },
              ],
            },
          ],
        },
        {
          id: 'deploy',
          costs: [],
          limit: 'once-per-game',
          effects: [
            { kind: 'deploy', as: 'unit', condition: { kind: 'resources-at-least', amount: 4 } },
          ],
        },
      ],
    },
    unit: {
      power: 2,
      hp: 5,
      arena: 'ground',
      constant: [{ condition: { kind: 'more-cards-than-opponent' }, abilities: { raid: 2 } }],
    },
  },
} as const satisfies LeaderDefinition;
