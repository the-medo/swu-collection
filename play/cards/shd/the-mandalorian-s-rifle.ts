import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteTheMandalorianSRifle = {
  cardId: 'the-mandalorian-s-rifle',
  name: "The Mandalorian's Rifle",
  kind: 'upgrade',
  aspects: ['Heroism'],
  traits: ['Item', 'Weapon'],
  cost: 3,
  token: false,
  modifiers: {
    power: 3,
    hp: 0,
  },
  attachTo: 'friendly-unit',
  attachFilter: {
    withoutTrait: 'Vehicle',
  },
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'if',
          condition: {
            kind: 'unit-matches',
            target: 'attached',
            filter: {
              name: 'The Mandalorian',
            },
          },
          effects: [
            {
              kind: 'select-unit',
              filter: {
                controller: 'enemy',
                nonLeader: true,
                exhausted: true,
              },
              optional: false,
              bind: 'chosen',
              effects: [
                {
                  kind: 'capture-unit',
                  guard: 'attached',
                  target: 'chosen',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UpgradeDefinition;
