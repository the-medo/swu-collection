import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-effects.json.
export const covertOperative = {
  cardId: 'covert-operative',
  name: 'Covert Operative',
  kind: 'unit',
  aspects: ['Heroism'],
  traits: ['Rebel'],
  cost: 4,
  power: 2,
  hp: 4,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'enemy',
            nonLeader: true,
            maxCost: 2,
          },
          bind: 'chosen',
          optional: false,
          effects: [
            {
              kind: 'capture-unit',
              guard: 'source',
              target: 'chosen',
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
