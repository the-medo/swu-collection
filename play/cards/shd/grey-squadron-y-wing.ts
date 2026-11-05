import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteGreySquadronYWing = {
  cardId: 'grey-squadron-y-wing',
  name: 'Grey Squadron Y-Wing',
  kind: 'unit',
  aspects: ['Heroism'],
  traits: ['Rebel', 'Vehicle', 'Fighter'],
  cost: 2,
  power: 1,
  hp: 3,
  arena: 'space',
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'select-target',
          bases: 'enemy',
          units: {
            controller: 'enemy',
          },
          chooser: 'enemy',
          bind: 'chosen',
          optional: false,
          effects: [
            {
              kind: 'choose-mode',
              options: [
                {
                  id: 'resolve',
                  effects: [
                    {
                      kind: 'damage-target',
                      target: 'chosen',
                      amount: 2,
                    },
                  ],
                },
                {
                  id: 'decline',
                  effects: [],
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
