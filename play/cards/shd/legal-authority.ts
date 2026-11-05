import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteLegalAuthority = {
  cardId: 'legal-authority',
  name: 'Legal Authority',
  kind: 'upgrade',
  aspects: ['Command'],
  traits: ['Law'],
  cost: 2,
  token: false,
  modifiers: {
    power: 0,
    hp: 2,
  },
  attachTo: 'friendly-unit',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'enemy',
            nonLeader: true,
            powerLessThan: 'attached',
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
} as const satisfies UpgradeDefinition;
