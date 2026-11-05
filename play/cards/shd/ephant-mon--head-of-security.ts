import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteEphantMonHeadOfSecurity = {
  cardId: 'ephant-mon--head-of-security',
  name: 'Ephant Mon, Head of Security',
  kind: 'unit',
  aspects: ['Command', 'Villainy'],
  traits: ['Underworld'],
  cost: 5,
  unique: true,
  power: 4,
  hp: 6,
  arena: 'ground',
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'enemy',
            nonLeader: true,
            attackedBaseThisPhase: true,
          },
          optional: false,
          bind: 'victim',
          effects: [
            {
              kind: 'select-unit',
              filter: {
                controller: 'friendly',
                sameArenaAs: 'victim',
              },
              optional: false,
              bind: 'guard',
              effects: [
                {
                  kind: 'capture-unit',
                  guard: 'guard',
                  target: 'victim',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
