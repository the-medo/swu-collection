import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-effects.json.
export const amnestyOfficer = {
  cardId: 'amnesty-officer',
  name: 'Amnesty Officer',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['New Republic', 'Official'],
  cost: 2,
  power: 2,
  hp: 2,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            minKeywords: 1,
          },
          optional: true,
          bind: 'chosen',
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'exhaust',
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
