import type { EventDefinition } from '../definition.ts';

// Official identity and printed text are pinned in testing/fixtures/ibh.json.
export const iVeFoundThem = {
  cardId: 'i-ve-found-them',
  name: "I've Found Them",
  kind: 'event',
  aspects: ['Command'],
  traits: ['Gambit'],
  cost: 2,
  effects: [
    {
      kind: 'reveal-deck-cards',
      player: 'self',
      count: 3,
      group: 'revealed',
      effects: [
        {
          kind: 'inspect-zone',
          zone: 'deck',
          onlyFromGroup: 'revealed',
          player: 'self',
          chooser: 'owner',
          filter: {
            kind: 'unit',
          },
          min: 1,
          max: 1,
          bind: 'drawn',
          effects: [
            {
              kind: 'draw-card',
              target: 'drawn',
            },
          ],
          after: [
            {
              kind: 'move-cards',
              group: 'revealed',
              from: 'deck',
              to: 'discard',
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
