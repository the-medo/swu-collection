import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-effects.json.
export const milodonRider = {
  cardId: 'milodon-rider',
  name: 'Milodon Rider',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Fringe', 'Creature'],
  cost: 6,
  power: 5,
  hp: 6,
  arena: 'ground',
  keywords: ['Ambush'],
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'friendly',
            otherThan: 'source',
            nonLeader: true,
          },
          bind: 'chosen',
          optional: true,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'return-to-hand',
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
