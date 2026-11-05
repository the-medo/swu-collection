import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteAllianceDispatcher = {
  cardId: 'alliance-dispatcher',
  name: 'Alliance Dispatcher',
  kind: 'unit',
  aspects: ['Heroism', 'Command'],
  traits: ['Rebel'],
  cost: 1,
  power: 1,
  hp: 2,
  arena: 'ground',
  actions: [
    {
      id: 'action',
      costs: [
        {
          kind: 'exhaust-self',
        },
      ],
      limit: null,
      effects: [
        {
          kind: 'play-card',
          from: 'hand',
          filter: {
            kind: 'unit',
          },
          optional: false,
          discount: 1,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
