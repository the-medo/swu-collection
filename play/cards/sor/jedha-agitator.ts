import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteJedhaAgitator = {
  cardId: 'jedha-agitator',
  name: 'Jedha Agitator',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Rebel'],
  cost: 2,
  power: 2,
  hp: 1,
  arena: 'ground',
  keywords: ['Saboteur'],
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'units-at-least',
            filter: {
              controller: 'friendly',
              leader: true,
            },
            amount: 1,
          },
          effects: [
            {
              kind: 'select-target',
              units: {
                arena: 'ground',
              },
              bases: 'any',
              bind: 'chosen',
              optional: false,
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
