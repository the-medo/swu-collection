import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteWolfPackEscort = {
  cardId: 'wolf-pack-escort',
  name: 'Wolf Pack Escort',
  kind: 'unit',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Republic', 'Vehicle', 'Fighter'],
  cost: 1,
  power: 2,
  hp: 1,
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
            nonLeader: true,
            withoutTrait: 'Vehicle',
          },
          optional: true,
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
