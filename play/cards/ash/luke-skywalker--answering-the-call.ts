import type { UnitDefinition } from '../definition.ts';

// ASH 112. Printed text is pinned in the meta token fixture.
export const lukeSkywalkerAnsweringTheCall = {
  cardId: 'luke-skywalker--answering-the-call',
  name: 'Luke Skywalker, Answering the Call',
  kind: 'unit',
  aspects: ['Command', 'Heroism'],
  traits: ['Force', 'Jedi'],
  unique: true,
  cost: 6,
  power: 5,
  hp: 5,
  arena: 'ground',
  restore: 1,
  triggers: [
    {
      id: 'on-played',
      timing: 'played',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'units-at-least',
            amount: 4,
            filter: {
              controller: 'friendly',
            },
          },
          effects: [
            {
              kind: 'damage-units',
              amount: 3,
              filter: {
                controller: 'enemy',
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
