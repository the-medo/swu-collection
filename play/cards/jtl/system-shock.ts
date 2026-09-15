import type { EventDefinition } from '../definition.ts';

// JTL 175. Printed text is pinned in meta-movement fixture.
export const systemShock = {
  cardId: 'system-shock',
  name: 'System Shock',
  kind: 'event',
  aspects: ['Aggression'],
  traits: ['Tactic'],
  cost: 1,
  effects: [
    {
      kind: 'select-upgrades',
      filter: {
        nonLeader: true,
      },
      min: 1,
      max: 1,
      bind: 'upgrades',
      effects: [
        {
          kind: 'move-upgrades',
          group: 'upgrades',
          to: 'discard',
          effects: [
            {
              kind: 'on-unit',
              target: 'host',
              operation: {
                kind: 'damage',
                amount: 1,
              },
            },
          ],
          bindHost: 'host',
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
