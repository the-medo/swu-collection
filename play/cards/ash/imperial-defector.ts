import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-effects.json.
export const imperialDefector = {
  cardId: 'imperial-defector',
  name: 'Imperial Defector',
  kind: 'unit',
  aspects: ['Heroism'],
  traits: ['Imperial', 'Rebel'],
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
          bind: 'look',
          effects: [],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
