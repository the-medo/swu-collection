import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-effects.json.
export const generalGrievousScuttlingToSafety = {
  cardId: 'general-grievous--scuttling-to-safety',
  name: 'General Grievous, Scuttling to Safety',
  kind: 'unit',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Separatist', 'Official'],
  unique: true,
  cost: 2,
  power: 3,
  hp: 3,
  arena: 'ground',
  keywords: ['Hidden'],
  triggers: [
    {
      id: 'attacked',
      timing: 'attacked',
      effects: [
        {
          kind: 'on-unit',
          target: 'source',
          operation: {
            kind: 'return-to-hand',
          },
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
