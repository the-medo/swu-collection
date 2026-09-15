import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-effects.json.
export const quinlanVosDarkDisciple = {
  cardId: 'quinlan-vos--dark-disciple',
  name: 'Quinlan Vos, Dark Disciple',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Force', 'Jedi', 'Republic'],
  unique: true,
  cost: 4,
  power: 4,
  hp: 5,
  arena: 'ground',
  triggers: [
    {
      id: 'on-attack',
      timing: 'attack',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'unit-matches',
            target: 'source',
            filter: {
              powerAtLeast: 6,
            },
          },
          effects: [
            {
              kind: 'select-target',
              bases: 'enemy',
              bind: 'base',
              optional: true,
              effects: [
                {
                  kind: 'damage-target',
                  target: 'base',
                  amount: 2,
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
