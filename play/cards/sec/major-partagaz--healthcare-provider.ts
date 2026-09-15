import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-effects.json.
export const majorPartagazHealthcareProvider = {
  cardId: 'major-partagaz--healthcare-provider',
  name: 'Major Partagaz, Healthcare Provider',
  kind: 'unit',
  aspects: ['Command', 'Villainy'],
  traits: ['Imperial', 'Official'],
  unique: true,
  cost: 2,
  power: 0,
  hp: 6,
  arena: 'ground',
  keywords: ['Overwhelm'],
  triggers: [
    {
      id: 'friendly-attack',
      timing: 'friendly-attack',
      effects: [
        {
          kind: 'on-unit',
          target: 'source',
          operation: {
            kind: 'modify',
            power: 2,
            hp: 2,
            duration: 'phase',
          },
        },
      ],
      condition: {
        kind: 'unit-matches',
        target: 'subject',
        filter: {
          trait: 'Official',
          otherThan: 'source',
        },
      },
    },
  ],
} as const satisfies UnitDefinition;
