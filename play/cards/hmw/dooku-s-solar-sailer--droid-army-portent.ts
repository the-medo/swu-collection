import { hmwUnit } from './define.ts';

export const hmwDookuSSolarSailerDroidArmyPortent = hmwUnit(
  'dooku-s-solar-sailer--droid-army-portent',
  {
    triggers: [
      {
        id: 'played',
        timing: 'played',
        condition: {
          kind: 'units-at-least',
          filter: {
            controller: 'friendly',
            maxCost: 1,
          },
          amount: 1,
        },
        effects: [
          {
            kind: 'inspect-zone',
            zone: 'hand',
            player: 'enemy',
            chooser: 'owner',
            filter: {},
            min: 1,
            max: 1,
            bind: 'chosen',
            effects: [
              {
                kind: 'move-card',
                target: 'chosen',
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
);
