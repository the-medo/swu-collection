import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-passives.json.
export const slyMooreWitnessToPower = {
  cardId: 'sly-moore--witness-to-power',
  name: 'Sly Moore, Witness to Power',
  kind: 'unit',
  aspects: ['Vigilance', 'Villainy'],
  traits: ['Republic', 'Official'],
  unique: true,
  cost: 4,
  power: 2,
  hp: 6,
  arena: 'ground',
  keywords: ['Plot'],
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'phase-stat-modifier',
          filter: {
            controller: 'enemy',
            attacking: 'base',
          },
          power: -2,
          hp: 0,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
