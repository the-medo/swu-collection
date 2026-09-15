import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-effects.json.
export const bladeSquadronBWing = {
  cardId: 'blade-squadron-b-wing',
  name: 'Blade Squadron B-Wing',
  kind: 'unit',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Rebel', 'Vehicle', 'Fighter'],
  cost: 3,
  power: 3,
  hp: 3,
  arena: 'space',
  triggers: [
    {
      id: 'exhausted-enemies',
      timing: 'played',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'units-at-least',
            filter: {
              controller: 'enemy',
              exhausted: true,
            },
            amount: 3,
          },
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
                    kind: 'give-token',
                    token: 'shield',
                    count: 1,
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
