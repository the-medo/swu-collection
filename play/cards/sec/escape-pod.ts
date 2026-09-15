import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-effects.json.
export const escapePod = {
  cardId: 'escape-pod',
  name: 'Escape Pod',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Vehicle', 'Transport'],
  cost: 1,
  power: 0,
  hp: 3,
  arena: 'space',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'friendly',
            withoutTrait: 'Vehicle',
            nonLeader: true,
          },
          bind: 'chosen',
          optional: true,
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
