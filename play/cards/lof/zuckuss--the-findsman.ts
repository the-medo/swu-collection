import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-effects.json.
export const zuckussTheFindsman = {
  cardId: 'zuckuss--the-findsman',
  name: 'Zuckuss, The Findsman',
  kind: 'unit',
  aspects: ['Cunning', 'Cunning'],
  traits: ['Force', 'Bounty Hunter'],
  unique: true,
  cost: 5,
  power: 4,
  hp: 7,
  arena: 'ground',
  triggers: [
    {
      id: 'on-attack',
      timing: 'attack',
      effects: [
        {
          kind: 'name-card',
          bind: 'named',
          effects: [
            {
              kind: 'mill',
              player: 'defender',
              count: 1,
              bind: 'milled',
              effects: [
                {
                  kind: 'if',
                  condition: {
                    kind: 'card-matches',
                    target: 'milled',
                    filter: {
                      named: 'named',
                    },
                  },
                  effects: [
                    {
                      kind: 'on-unit',
                      target: 'source',
                      operation: {
                        kind: 'modify',
                        power: 4,
                        hp: 0,
                        duration: 'attack',
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
