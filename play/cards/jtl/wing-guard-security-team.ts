import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-foundations.json.
export const wingGuardSecurityTeam = {
  cardId: 'wing-guard-security-team',
  name: 'Wing Guard Security Team',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Fringe', 'Trooper'],
  cost: 6,
  power: 4,
  hp: 4,
  arena: 'ground',
  keywords: ['Sentinel'],
  triggers: [
    {
      id: 'shield-fringe',
      timing: 'played',
      effects: [
        {
          kind: 'select-units',
          filter: {
            trait: 'Fringe',
          },
          min: 0,
          max: 2,
          bind: 'shielded',
          effects: [
            {
              kind: 'each-unit',
              filter: {
                inGroup: 'shielded',
              },
              bind: 'chosen',
              effects: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'give-token',
                    token: 'shield',
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
