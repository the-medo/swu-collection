import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-effects.json.
export const hanSGoldenDice = {
  cardId: 'han-s-golden-dice',
  name: "Han's Golden Dice",
  kind: 'upgrade',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Item'],
  unique: true,
  cost: 1,
  token: false,
  modifiers: {
    power: 0,
    hp: 0,
  },
  attachTo: 'unit',
  grants: {
    triggers: [
      {
        id: 'attack',
        timing: 'attack',
        effects: [
          {
            kind: 'mill',
            player: 'self',
            count: 1,
            bind: 'first',
            group: 'milled',
            effects: [
              {
                kind: 'if',
                condition: {
                  kind: 'card-matches',
                  target: 'first',
                  filter: {
                    costParity: 'odd',
                  },
                },
                effects: [
                  {
                    kind: 'create-credits',
                    amount: 1,
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
} as const satisfies UpgradeDefinition;
