import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteKananJarrusRevealedJedi = {
  cardId: 'kanan-jarrus--revealed-jedi',
  name: 'Kanan Jarrus, Revealed Jedi',
  kind: 'unit',
  aspects: ['Heroism', 'Vigilance'],
  traits: ['Force', 'Jedi', 'Rebel', 'Spectre'],
  cost: 4,
  unique: true,
  power: 4,
  hp: 5,
  arena: 'ground',
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'mill',
          player: 'defender',
          count: {
            kind: 'unit-count',
            filter: {
              controller: 'friendly',
              trait: 'Spectre',
            },
          },
          bind: 'milled',
          group: 'discarded',
          effects: [
            {
              kind: 'heal-own-base',
              amount: {
                kind: 'group-aspects-count',
                group: 'discarded',
              },
            },
          ],
        },
      ],
      optional: true,
    },
  ],
} as const satisfies UnitDefinition;
