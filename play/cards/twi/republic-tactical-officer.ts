import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteRepublicTacticalOfficer = {
  cardId: 'republic-tactical-officer',
  name: 'Republic Tactical Officer',
  kind: 'unit',
  aspects: ['Command', 'Heroism'],
  traits: ['Republic', 'Clone'],
  cost: 2,
  power: 1,
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
            controller: 'friendly',
            trait: 'Republic',
          },
          optional: true,
          bind: 'chosen',
          effects: [
            {
              kind: 'attack-bound',
              target: 'chosen',
              optional: false,
              powerBonus: 2,
            },
          ],
          forAttack: {},
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
