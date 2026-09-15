import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-effects.json.
export const mosEspaWatermonger = {
  cardId: 'mos-espa-watermonger',
  name: 'Mos Espa Watermonger',
  kind: 'unit',
  aspects: [],
  traits: ['Fringe'],
  cost: 2,
  power: 1,
  hp: 3,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'draw-cards',
          amount: 1,
        },
        {
          kind: 'inspect-zone',
          zone: 'hand',
          player: 'self',
          chooser: 'owner',
          filter: {},
          min: 1,
          max: 1,
          bind: 'discarded',
          effects: [
            {
              kind: 'move-card',
              target: 'discarded',
              from: 'hand',
              to: 'discard',
              discardBy: 'owner',
              effects: [],
            },
          ],
        },
      ],
      optional: true,
    },
  ],
} as const satisfies UnitDefinition;
