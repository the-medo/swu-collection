import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyComplete501StLiberator = {
  cardId: '501st-liberator',
  name: '501st Liberator',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Republic', 'Clone', 'Trooper'],
  cost: 3,
  power: 3,
  hp: 3,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'units-at-least',
            filter: {
              controller: 'friendly',
              trait: 'Republic',
              otherThan: 'source',
            },
            amount: 1,
          },
          effects: [
            {
              kind: 'select-target',
              bases: 'any',
              bind: 'chosen',
              optional: true,
              effects: [
                {
                  kind: 'heal-target',
                  target: 'chosen',
                  amount: 3,
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
