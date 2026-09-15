import type { UpgradeDefinition } from '../definition.ts';

// ASH 002. Printed text is pinned in the meta token fixture.
export const advantage = {
  cardId: 'advantage',
  name: 'Advantage',
  kind: 'upgrade',
  aspects: [],
  traits: ['Innate'],
  cost: 0,
  token: true,
  modifiers: {
    power: 1,
    hp: 0,
  },
  attachTo: 'unit',
  triggers: [
    {
      id: 'on-host-combat-ended',
      timing: 'host-combat-ended',
      effects: [
        {
          kind: 'defeat-self-upgrade',
        },
      ],
    },
  ],
} as const satisfies UpgradeDefinition;
