import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteSlyMooreSecretiveAdvisor = {
  cardId: 'sly-moore--secretive-advisor',
  name: 'Sly Moore, Secretive Advisor',
  kind: 'unit',
  aspects: ['Cunning'],
  traits: ['Republic', 'Official'],
  cost: 3,
  unique: true,
  power: 3,
  hp: 3,
  arena: 'ground',
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'enemy',
            token: true,
          },
          optional: false,
          bind: 'chosen',
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'take-control',
                player: 'self',
                returnWhen: 'regroup',
              },
            },
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'ready',
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
