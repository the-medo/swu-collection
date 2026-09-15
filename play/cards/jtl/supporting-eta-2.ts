import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-foundations.json.
export const supportingEta2 = {
  cardId: 'supporting-eta-2',
  name: 'Supporting Eta-2',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Republic', 'Vehicle', 'Fighter'],
  cost: 2,
  power: 2,
  hp: 2,
  arena: 'space',
  triggers: [
    {
      id: 'ground-support',
      timing: 'attack',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            arena: 'ground',
          },
          bind: 'chosen',
          optional: true,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'modify',
                power: 2,
                hp: 0,
                duration: 'phase',
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
