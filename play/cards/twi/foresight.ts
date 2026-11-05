import type { UpgradeDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteForesight = {
  cardId: 'foresight',
  name: 'Foresight',
  kind: 'upgrade',
  aspects: ['Vigilance'],
  traits: ['Learned'],
  cost: 1,
  token: false,
  modifiers: {
    power: 0,
    hp: 2,
  },
  attachTo: 'unit',
  grants: {
    triggers: [
      {
        id: 'regroup-start',
        timing: 'regroup-start',
        effects: [
          {
            kind: 'name-card',
            bind: 'named',
            effects: [
              {
                kind: 'inspect-zone',
                zone: 'deck',
                player: 'self',
                chooser: 'owner',
                filter: {
                  named: 'named',
                },
                min: 0,
                max: 1,
                bind: 'card',
                effects: [
                  {
                    kind: 'reveal-card',
                    target: 'card',
                    effects: [
                      {
                        kind: 'draw-card',
                        target: 'card',
                      },
                    ],
                  },
                ],
                top: 1,
              },
            ],
          },
        ],
      },
    ],
  },
} as const satisfies UpgradeDefinition;
