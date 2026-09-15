import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-effects.json.
export const ahsokaTanoILearnedItFromYou = {
  cardId: 'ahsoka-tano--i-learned-it-from-you',
  name: 'Ahsoka Tano, I Learned It from You',
  kind: 'unit',
  aspects: ['Command', 'Heroism'],
  traits: ['Force', 'Jedi', 'Republic'],
  unique: true,
  cost: 3,
  power: 2,
  hp: 5,
  arena: 'ground',
  triggers: [
    {
      id: 'attack-ended',
      timing: 'attack-ended',
      effects: [
        {
          kind: 'disclose',
          aspects: ['Command', 'Heroism'],
          effects: [
            {
              kind: 'select-unit',
              filter: {
                controller: 'friendly',
                otherThan: 'source',
              },
              bind: 'chosen',
              optional: false,
              effects: [
                {
                  kind: 'attack-bound',
                  target: 'chosen',
                  optional: false,
                },
              ],
              forAttack: {},
            },
          ],
        },
      ],
      condition: {
        kind: 'value-at-least',
        name: 'survived',
        amount: 1,
      },
    },
  ],
} as const satisfies UnitDefinition;
