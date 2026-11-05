import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteRuthlessAssassin = {
  cardId: 'ruthless-assassin',
  name: 'Ruthless Assassin',
  kind: 'unit',
  aspects: ['Villainy'],
  traits: ['Underworld', 'Bounty Hunter'],
  cost: 2,
  power: 3,
  hp: 3,
  arena: 'ground',
  keywords: ['Overwhelm'],
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'friendly',
          },
          optional: false,
          bind: 'chosen',
          effects: [
            {
              kind: 'damage-target',
              target: 'chosen',
              amount: 2,
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
