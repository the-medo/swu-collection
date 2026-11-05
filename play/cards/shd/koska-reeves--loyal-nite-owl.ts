import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteKoskaReevesLoyalNiteOwl = {
  cardId: 'koska-reeves--loyal-nite-owl',
  name: 'Koska Reeves, Loyal Nite Owl',
  kind: 'unit',
  aspects: ['Heroism', 'Aggression'],
  traits: ['Mandalorian', 'Trooper'],
  cost: 4,
  unique: true,
  power: 4,
  hp: 5,
  arena: 'ground',
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
              filter: {
                arena: 'ground',
              },
              optional: true,
              bind: 'chosen',
              effects: [
                {
                  kind: 'damage-target',
                  target: 'chosen',
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
