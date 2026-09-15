import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-effects.json.
export const directorKrennicILoseNothingButTime = {
  cardId: 'director-krennic--i-lose-nothing-but-time',
  name: 'Director Krennic, I Lose Nothing But Time',
  kind: 'unit',
  aspects: ['Command', 'Villainy'],
  traits: ['Imperial', 'Official'],
  unique: true,
  cost: 9,
  power: 8,
  hp: 10,
  arena: 'ground',
  keywords: ['Sentinel'],
  triggers: [
    {
      id: 'attacked',
      timing: 'attacked',
      effects: [
        {
          kind: 'mill',
          player: 'self',
          count: 1,
          bind: 'milled',
          group: 'milled',
          effects: [
            {
              kind: 'inspect-zone',
              zone: 'discard',
              player: 'self',
              chooser: 'owner',
              filter: {
                kind: 'unit',
                inGroup: 'milled',
              },
              min: 0,
              max: 1,
              bind: 'chosen',
              effects: [
                {
                  kind: 'move-card',
                  target: 'chosen',
                  from: 'discard',
                  to: 'hand',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
