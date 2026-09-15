import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-effects.json.
export const jediInHiding = {
  cardId: 'jedi-in-hiding',
  name: 'Jedi In Hiding',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Force', 'Jedi'],
  cost: 3,
  power: 3,
  hp: 3,
  arena: 'ground',
  keywords: ['Hidden'],
  triggers: [
    {
      id: 'when-defeated',
      timing: 'defeated',
      effects: [
        {
          kind: 'pay',
          costs: [
            {
              kind: 'force',
            },
          ],
          optional: true,
          effects: [
            {
              kind: 'inspect-zone',
              zone: 'hand',
              player: 'enemy',
              chooser: 'owner',
              filter: {},
              min: 1,
              max: 1,
              bind: 'discarded',
              effects: [
                {
                  kind: 'move-card',
                  target: 'discarded',
                  from: 'hand',
                  to: 'discard',
                  discardBy: 'owner',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
