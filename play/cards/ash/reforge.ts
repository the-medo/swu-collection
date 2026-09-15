import type { EventDefinition } from '../definition.ts';
// ASH 090. The host is bound before defeat; a new incarnation cannot replace it.
export const reforge = {
  cardId: 'reforge',
  name: 'Reforge',
  kind: 'event',
  cost: 2,
  aspects: ['Vigilance'],
  traits: ['Supply'],
  effects: [
    {
      kind: 'select-unit',
      filter: { controller: 'friendly', upgraded: true },
      optional: false,
      bind: 'original-host',
      effects: [
        {
          kind: 'select-upgrades',
          filter: { attachedTo: 'original-host' },
          min: 1,
          max: 1,
          bind: 'old-upgrade',
          effects: [
            {
              kind: 'move-upgrades',
              group: 'old-upgrade',
              to: 'discard',
              bindHost: 'reforged-host',
              effects: [
                {
                  kind: 'search-deck',
                  count: 8,
                  filter: 'upgrade',
                  attachesTo: 'reforged-host',
                  max: 1,
                  play: { discount: 4 },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
