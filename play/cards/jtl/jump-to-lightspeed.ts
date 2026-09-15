import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-payments.json.
export const jumpToLightspeed = {
  cardId: 'jump-to-lightspeed',
  name: 'Jump to Lightspeed',
  kind: 'event',
  aspects: ['Cunning'],
  traits: ['Gambit'],
  cost: 2,
  effects: [
    {
      kind: 'select-unit',
      filter: {
        controller: 'friendly',
        arena: 'space',
      },
      bind: 'departing',
      optional: false,
      effects: [
        {
          kind: 'select-upgrades',
          filter: {
            attachedTo: 'departing',
            nonLeader: true,
          },
          min: 0,
          max: 'all',
          bind: 'returning',
          effects: [
            {
              kind: 'return-unit-with-upgrades',
              target: 'departing',
              upgrades: 'returning',
              freeNextCopy: true,
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
