import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-history.json.
export const theEliteSquadNeutralizingInsurgents = {
  cardId: 'the-elite-squad--neutralizing-insurgents',
  name: 'The Elite Squad, Neutralizing Insurgents',
  kind: 'unit',
  aspects: ['Aggression', 'Villainy'],
  traits: ['Imperial', 'Trooper'],
  unique: true,
  cost: 8,
  power: 6,
  hp: 8,
  arena: 'ground',
  keywords: ['Grit'],
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            unique: true,
            otherThan: 'source',
          },
          bind: 'chosen',
          optional: true,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'damage',
                amount: 2,
              },
            },
          ],
        },
      ],
    },
    {
      id: 'damaged',
      timing: 'damaged',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            unique: true,
            otherThan: 'source',
          },
          bind: 'chosen',
          optional: true,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'damage',
                amount: 2,
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
