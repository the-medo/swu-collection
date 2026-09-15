import type { UnitDefinition } from '../definition.ts';

// LOF 200. Printed text is pinned in meta-hidden-zones fixture.
export const quiGonJinnTheNegotiationsWillBeShort = {
  cardId: 'qui-gon-jinn--the-negotiations-will-be-short',
  name: 'Qui-Gon Jinn, The Negotiations Will Be Short',
  kind: 'unit',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Force', 'Jedi', 'Republic'],
  cost: 7,
  unique: true,
  power: 7,
  hp: 5,
  arena: 'ground',
  keywords: ['Ambush'],
  triggers: [
    {
      id: 'on-defeated',
      timing: 'defeated',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            nonLeader: true,
            arena: 'ground',
          },
          bind: 'chosen',
          optional: true,
          effects: [
            {
              kind: 'unit-to-deck',
              target: 'chosen',
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
