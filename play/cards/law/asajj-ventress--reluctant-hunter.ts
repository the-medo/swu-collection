import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-effects.json.
export const asajjVentressReluctantHunter = {
  cardId: 'asajj-ventress--reluctant-hunter',
  name: 'Asajj Ventress, Reluctant Hunter',
  kind: 'unit',
  aspects: ['Command', 'Aggression'],
  traits: ['Force', 'Underworld', 'Bounty Hunter'],
  unique: true,
  cost: 5,
  power: 3,
  hp: 3,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            trait: 'Bounty Hunter',
            otherThan: 'source',
          },
          bind: 'chosen',
          optional: true,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'ready',
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
