import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-foundations.json.
export const earlySetWingLeader = {
  cardId: 'wing-leader',
  name: 'Wing Leader',
  kind: 'unit',
  aspects: ['Heroism'],
  traits: ['Rebel', 'Vehicle', 'Fighter'],
  cost: 3,
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
            trait: 'Rebel',
            otherThan: 'source',
          },
          bind: 'chosen',
          optional: false,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'give-token',
                token: 'experience',
                count: 2,
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
