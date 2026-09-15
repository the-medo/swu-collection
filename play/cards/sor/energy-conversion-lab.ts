import type { BaseDefinition } from '../definition.ts';

// Official text and clarifications are pinned in leader-base-foundations.json.
export const energyConversionLab = {
  cardId: 'energy-conversion-lab',
  kind: 'base',
  name: 'Energy Conversion Lab',
  aspects: ['Command'],
  traits: [],
  hp: 25,
  actions: [
    {
      id: 'epic',
      costs: [],
      limit: 'once-per-game',
      effects: [
        {
          kind: 'play-card',
          from: 'hand',
          filter: {
            kind: 'unit',
            maxCost: 6,
          },
          optional: false,
          phaseAbilities: {
            keywords: ['Ambush'],
          },
        },
      ],
    },
  ],
} as const satisfies BaseDefinition;
