import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-effects.json.
export const viperProbeDroid = {
  cardId: 'viper-probe-droid',
  name: 'Viper Probe Droid',
  kind: 'unit',
  aspects: ['Villainy'],
  traits: ['Imperial', 'Droid'],
  cost: 2,
  power: 3,
  hp: 2,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'inspect-zone',
          zone: 'hand',
          player: 'enemy',
          chooser: 'self',
          filter: {},
          min: 0,
          max: 0,
          bind: 'seen',
          effects: [],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
