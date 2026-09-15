import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-effects.json.
export const tacticalHeavyBomber = {
  cardId: 'tactical-heavy-bomber',
  name: 'Tactical Heavy Bomber',
  kind: 'unit',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Resistance', 'Vehicle', 'Transport'],
  cost: 5,
  power: 3,
  hp: 5,
  arena: 'space',
  triggers: [
    {
      id: 'bombard',
      timing: 'attack',
      effects: [
        {
          kind: 'indirect-damage',
          amount: {
            kind: 'unit-stat',
            target: 'source',
            stat: 'power',
          },
          recipient: 'defender',
          after: [
            {
              kind: 'if',
              condition: {
                kind: 'value-at-least',
                name: 'base-damage',
                amount: 1,
              },
              effects: [
                {
                  kind: 'draw-cards',
                  amount: 1,
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
