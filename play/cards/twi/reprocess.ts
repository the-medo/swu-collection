import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteReprocess = {
  cardId: 'reprocess',
  name: 'Reprocess',
  kind: 'event',
  aspects: ['Command', 'Villainy'],
  traits: ['Supply'],
  cost: 3,
  effects: [
    {
      kind: 'inspect-zone',
      zone: 'discard',
      player: 'self',
      chooser: 'owner',
      filter: {
        kind: 'unit',
      },
      min: 0,
      max: 4,
      bind: 'card',
      effects: [
        {
          kind: 'bottom-deck-group',
          group: 'chosen',
          from: 'discard',
          countAs: 'returned',
          effects: [
            {
              kind: 'create-unit',
              cardId: 'battle-droid',
              count: {
                kind: 'value',
                name: 'returned',
              },
            },
          ],
        },
      ],
      group: 'chosen',
    },
  ],
} as const satisfies EventDefinition;
