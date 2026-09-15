import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-effects.json.
export const saeseeTiinCourageousWarrior = {
  cardId: 'saesee-tiin--courageous-warrior',
  name: 'Saesee Tiin, Courageous Warrior',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Force', 'Jedi', 'Republic'],
  unique: true,
  cost: 5,
  power: 4,
  hp: 6,
  arena: 'ground',
  triggers: [
    {
      id: 'when-played',
      timing: 'played',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'initiative',
          },
          effects: [
            {
              kind: 'damage-units',
              amount: 1,
              filter: {},
              max: 3,
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
