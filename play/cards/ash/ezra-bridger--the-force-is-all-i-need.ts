import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-effects.json.
export const ezraBridgerTheForceIsAllINeed = {
  cardId: 'ezra-bridger--the-force-is-all-i-need',
  name: 'Ezra Bridger, The Force is All I Need',
  kind: 'unit',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Force', 'Jedi', 'Spectre'],
  unique: true,
  cost: 6,
  power: 6,
  hp: 6,
  arena: 'ground',
  keywords: ['Support'],
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'unit-matches',
            target: 'source',
            filter: {
              upgraded: true,
            },
          },
          effects: [
            {
              kind: 'select-unit',
              filter: {},
              optional: true,
              bind: 'chosen',
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'modify',
                    power: -3,
                    hp: 0,
                    duration: 'phase',
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
