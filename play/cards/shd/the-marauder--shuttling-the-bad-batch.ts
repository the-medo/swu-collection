import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteTheMarauderShuttlingTheBadBatch = {
  cardId: 'the-marauder--shuttling-the-bad-batch',
  name: 'The Marauder, Shuttling the Bad Batch',
  kind: 'unit',
  aspects: ['Command', 'Heroism'],
  traits: ['Fringe', 'Vehicle', 'Transport'],
  cost: 5,
  unique: true,
  power: 4,
  hp: 5,
  arena: 'space',
  keywords: ['Ambush'],
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'inspect-zone',
          zone: 'discard',
          player: 'self',
          chooser: 'owner',
          filter: {},
          min: 1,
          max: 1,
          bind: 'card',
          effects: [
            {
              kind: 'if',
              condition: {
                kind: 'units-at-least',
                filter: {
                  controller: 'friendly',
                  sameNameAs: 'card',
                },
                amount: 1,
              },
              effects: [
                {
                  kind: 'resource-card',
                  target: 'card',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
