import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-effects.json.
export const cassianAndorThreadingTheEye = {
  cardId: 'cassian-andor--threading-the-eye',
  name: 'Cassian Andor, Threading the Eye',
  kind: 'unit',
  aspects: ['Vigilance', 'Heroism'],
  traits: ['Rebel', 'Pilot'],
  unique: true,
  cost: 3,
  power: 3,
  hp: 4,
  arena: 'ground',
  piloting: [
    {
      id: 'piloting',
      cost: 2,
      aspects: ['Vigilance', 'Heroism'],
    },
  ],
  upgrade: {
    attachTo: 'friendly-vehicle-without-pilot',
    modifiers: {
      power: 1,
      hp: 3,
    },
    grants: {
      triggers: [
        {
          id: 'defending-deck',
          timing: 'attack',
          effects: [
            {
              kind: 'mill',
              player: 'defender',
              count: 1,
              bind: 'discarded',
              effects: [
                {
                  kind: 'if',
                  condition: {
                    kind: 'card-matches',
                    target: 'discarded',
                    filter: {
                      maxCost: 3,
                    },
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
    },
  },
} as const satisfies UnitDefinition;
