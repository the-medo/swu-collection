import type { UpgradeDefinition } from '../definition.ts';

// Printed text and official identity are pinned in the Top 8 conditional ability fixture.
export const diplomaticImmunity = {
  cardId: 'diplomatic-immunity',
  name: 'Diplomatic Immunity',
  kind: 'upgrade',
  aspects: ['Vigilance', 'Heroism'],
  traits: ['Law'],
  cost: 2,
  token: false,
  modifiers: {
    power: 2,
    hp: 2,
  },
  attachTo: 'unit',
  grants: {
    triggers: [
      {
        id: 'reduce-attacker',
        timing: 'attacked',
        effects: [
          {
            kind: 'disclose',
            aspects: ['Vigilance', 'Vigilance', 'Heroism', 'Heroism'],
            effects: [
              {
                kind: 'on-unit',
                target: 'attacker',
                operation: {
                  kind: 'modify',
                  power: -2,
                  hp: 0,
                  duration: 'attack',
                },
              },
            ],
          },
        ],
      },
    ],
  },
} as const satisfies UpgradeDefinition;
