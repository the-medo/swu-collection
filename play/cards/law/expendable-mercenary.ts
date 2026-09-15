import type { UnitDefinition } from '../definition.ts';

// LAW . V8 rules; printed text pinned in meta combat fixture.
export const expendableMercenary = {
  cardId: 'expendable-mercenary',
  name: 'Expendable Mercenary',
  kind: 'unit',
  aspects: ['Command'],
  traits: ['Underworld', 'Bounty Hunter'],
  cost: 4,
  power: 3,
  hp: 3,
  arena: 'ground',
  triggers: [
    {
      id: 'on-defeated',
      timing: 'defeated',
      effects: [
        {
          kind: 'self-resource',
          ready: false,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
