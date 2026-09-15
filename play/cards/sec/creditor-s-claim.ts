import type { UpgradeDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 token/effect fixture.
export const creditorSClaim = {
  cardId: 'creditor-s-claim',
  name: "Creditor's Claim",
  kind: 'upgrade',
  aspects: ['Vigilance', 'Villainy'],
  traits: ['Supply'],
  cost: 3,
  token: false,
  modifiers: {
    power: 2,
    hp: 2,
  },
  attachTo: 'unit',
  grants: {
    triggers: [
      {
        id: 'defeat-small-unit',
        timing: 'defeated',
        effects: [
          {
            kind: 'defeat-unit',
            filter: {
              remainingHpAtMost: 3,
            },
            optional: true,
          },
        ],
      },
    ],
  },
} as const satisfies UpgradeDefinition;
