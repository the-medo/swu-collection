import type { UpgradeDefinition } from '../definition.ts';

// ASH 199. Printed text is pinned in meta-movement fixture.
export const thereIsNoConflict = {
  cardId: 'there-is-no-conflict',
  name: 'There Is No Conflict',
  kind: 'upgrade',
  aspects: ['Cunning', 'Villainy'],
  traits: ['Innate'],
  cost: 2,
  token: false,
  modifiers: {
    power: 2,
    hp: 2,
  },
  attachTo: 'unit',
  triggers: [
    {
      id: 'on-played',
      timing: 'played',
      effects: [
        {
          kind: 'select-upgrades',
          filter: {
            attachedTo: 'attached',
            otherThan: 'source',
          },
          min: 0,
          max: 'all',
          bind: 'upgrades',
          effects: [
            {
              kind: 'move-upgrades',
              group: 'upgrades',
              to: 'hand',
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UpgradeDefinition;
