import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteLieutenantChildsenDeathStarPrisonWarden = {
  cardId: 'lieutenant-childsen--death-star-prison-warden',
  name: 'Lieutenant Childsen, Death Star Prison Warden',
  kind: 'unit',
  aspects: ['Villainy', 'Vigilance'],
  traits: ['Imperial', 'Official'],
  cost: 4,
  unique: true,
  power: 2,
  hp: 2,
  arena: 'ground',
  keywords: ['Sentinel'],
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'inspect-zone',
          zone: 'hand',
          player: 'self',
          chooser: 'owner',
          filter: {
            aspect: 'Vigilance',
          },
          min: 0,
          max: 4,
          bind: 'card',
          effects: [
            {
              kind: 'on-unit',
              target: 'source',
              operation: {
                kind: 'give-token',
                token: 'experience',
                count: {
                  kind: 'group-size',
                  group: 'revealed',
                },
              },
            },
          ],
          group: 'revealed',
          reveal: true,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
