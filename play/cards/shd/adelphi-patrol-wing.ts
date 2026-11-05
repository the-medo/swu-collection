import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteAdelphiPatrolWing = {
  cardId: 'adelphi-patrol-wing',
  name: 'Adelphi Patrol Wing',
  kind: 'unit',
  aspects: ['Command', 'Heroism'],
  traits: ['New Republic', 'Vehicle', 'Fighter'],
  cost: 5,
  power: 4,
  hp: 6,
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
          },
          optional: true,
          bind: 'chosen',
          effects: [
            {
              kind: 'attack-bound',
              target: 'chosen',
              optional: false,
              powerBonus: {
                kind: 'conditional',
                condition: {
                  kind: 'initiative',
                },
                then: 2,
                otherwise: 0,
              },
            },
          ],
          forAttack: {},
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
