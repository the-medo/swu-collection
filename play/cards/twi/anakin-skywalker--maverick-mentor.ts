import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteAnakinSkywalkerMaverickMentor = {
  cardId: 'anakin-skywalker--maverick-mentor',
  name: 'Anakin Skywalker, Maverick Mentor',
  kind: 'unit',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Force', 'Jedi', 'Republic'],
  cost: 5,
  unique: true,
  power: 6,
  hp: 6,
  arena: 'ground',
  keywords: ['Coordinate'],
  constant: [
    {
      condition: {
        kind: 'units-at-least',
        filter: {
          controller: 'friendly',
        },
        amount: 3,
      },
      abilities: {
        triggers: [
          {
            id: 'attack',
            timing: 'attack',
            effects: [
              {
                kind: 'draw-cards',
                amount: 1,
              },
            ],
          },
        ],
      },
    },
  ],
} as const satisfies UnitDefinition;
