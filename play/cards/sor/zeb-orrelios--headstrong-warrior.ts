import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteZebOrreliosHeadstrongWarrior = {
  cardId: 'zeb-orrelios--headstrong-warrior',
  name: 'Zeb Orrelios, Headstrong Warrior',
  kind: 'unit',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Rebel', 'Spectre'],
  cost: 5,
  unique: true,
  power: 5,
  hp: 5,
  arena: 'ground',
  triggers: [
    {
      id: 'attack-ended',
      timing: 'attack-ended',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'value-at-least',
            name: 'defender-defeated',
            amount: 1,
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
                  amount: 4,
                },
              ],
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
