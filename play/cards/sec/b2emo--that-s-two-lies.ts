import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-effects.json.
export const b2emoThatSTwoLies = {
  cardId: 'b2emo--that-s-two-lies',
  name: "B2EMO, That's Two Lies",
  kind: 'unit',
  aspects: ['Heroism'],
  traits: ['Fringe', 'Droid'],
  unique: true,
  cost: 1,
  power: 0,
  hp: 4,
  arena: 'ground',
  restore: 1,
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'disclose',
          aspects: ['Heroism', 'Heroism'],
          effects: [
            {
              kind: 'select-unit',
              filter: {},
              bind: 'chosen',
              optional: false,
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'modify',
                    power: 0,
                    hp: 0,
                    duration: 'phase',
                    abilities: {
                      keywords: ['Sentinel'],
                    },
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
