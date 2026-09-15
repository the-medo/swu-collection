import type { UpgradeDefinition } from '../definition.ts';
export const moralAuthority = {
  cardId: 'moral-authority',
  name: 'Moral Authority',
  kind: 'upgrade',
  token: false,
  cost: 3,
  aspects: ['Heroism'],
  traits: ['Innate'],
  modifiers: { power: 2, hp: 0 },
  attachTo: 'friendly-unit',
  attachFilter: { unique: true },
  triggers: [
    {
      id: 'played-capture',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: { controller: 'enemy', nonLeader: true, remainingHpLessThan: 'attached' },
          optional: false,
          bind: 'prisoner',
          effects: [{ kind: 'capture-unit', guard: 'attached', target: 'prisoner' }],
        },
      ],
    },
  ],
} as const satisfies UpgradeDefinition;
