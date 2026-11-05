import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteBazineNetalSpyForTheFirstOrder = {
  cardId: 'bazine-netal--spy-for-the-first-order',
  name: 'Bazine Netal, Spy for the First Order',
  kind: 'unit',
  aspects: ['Villainy', 'Cunning'],
  traits: ['Underworld'],
  cost: 2,
  unique: true,
  power: 1,
  hp: 3,
  arena: 'ground',
  smuggle: [
    {
      id: 'smuggle',
      cost: 4,
      aspects: ['Cunning', 'Villainy'],
    },
  ],
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'inspect-zone',
          zone: 'hand',
          player: 'enemy',
          chooser: 'self',
          filter: {},
          min: 0,
          max: 1,
          bind: 'card',
          effects: [
            {
              kind: 'move-card',
              from: 'hand',
              to: 'discard',
              target: 'card',
              effects: [
                {
                  kind: 'draw-cards',
                  amount: 1,
                  player: 'enemy',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
