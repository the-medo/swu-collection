import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteKintanIntimidator = {
  cardId: 'kintan-intimidator',
  name: 'Kintan Intimidator',
  kind: 'unit',
  aspects: ['Villainy', 'Cunning'],
  traits: ['Underworld'],
  cost: 1,
  power: 1,
  hp: 4,
  arena: 'ground',
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'on-unit',
          target: 'defender',
          operation: {
            kind: 'exhaust',
          },
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
