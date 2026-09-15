import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-choices.json.
export const cikatroVizagoBusinessIsWhatMatters = {
  cardId: 'cikatro-vizago--business-is-what-matters',
  name: 'Cikatro Vizago, Business is What Matters',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Underworld'],
  unique: true,
  cost: 3,
  power: 3,
  hp: 4,
  arena: 'ground',
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'reveal-top',
          player: 'self',
          bind: 'top',
          effects: [
            {
              kind: 'pay',
              player: 'enemy',
              costs: [
                {
                  kind: 'resources',
                  amount: 1,
                },
              ],
              optional: true,
              effects: [],
              otherwise: [
                {
                  kind: 'draw-card',
                  target: 'top',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
