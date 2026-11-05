import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompletePiratedStarfighter = {
  cardId: 'pirated-starfighter',
  name: 'Pirated Starfighter',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Underworld', 'Vehicle', 'Fighter'],
  cost: 2,
  power: 2,
  hp: 4,
  arena: 'space',
  raid: 1,
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'friendly',
            nonLeader: true,
          },
          optional: false,
          bind: 'chosen',
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
