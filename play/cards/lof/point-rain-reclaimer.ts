import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-effects.json.
export const pointRainReclaimer = {
  cardId: 'point-rain-reclaimer',
  name: 'Point Rain Reclaimer',
  kind: 'unit',
  aspects: ['Command', 'Heroism'],
  traits: ['Republic', 'Clone', 'Trooper'],
  cost: 1,
  power: 1,
  hp: 2,
  arena: 'ground',
  triggers: [
    {
      id: 'when-played',
      timing: 'played',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'units-at-least',
            filter: {
              controller: 'friendly',
              trait: 'Jedi',
            },
            amount: 1,
          },
          effects: [
            {
              kind: 'select-unit',
              filter: {
                sameAs: 'source',
              },
              bind: 'chosen',
              optional: true,
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'give-token',
                    token: 'experience',
                    count: 1,
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
