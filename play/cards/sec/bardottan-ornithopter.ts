import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-effects.json.
export const bardottanOrnithopter = {
  cardId: 'bardottan-ornithopter',
  name: 'Bardottan Ornithopter',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Fringe', 'Vehicle', 'Transport'],
  cost: 4,
  power: 3,
  hp: 4,
  arena: 'space',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'disclose',
          aspects: ['Vigilance'],
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
} as const satisfies UnitDefinition;
