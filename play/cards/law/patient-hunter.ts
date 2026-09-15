import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-history.json.
export const patientHunter = {
  cardId: 'patient-hunter',
  name: 'Patient Hunter',
  kind: 'unit',
  aspects: ['Command', 'Cunning'],
  traits: ['Bounty Hunter'],
  cost: 4,
  power: 3,
  hp: 3,
  arena: 'ground',
  triggers: [
    {
      id: 'regroup-start',
      timing: 'regroup-start',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            nonLeader: true,
          },
          bind: 'chosen',
          optional: true,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'give-token',
                token: 'experience',
                count: 1,
              },
              ifYouDo: [
                {
                  kind: 'on-unit',
                  target: 'chosen',
                  operation: {
                    kind: 'modify',
                    power: 0,
                    hp: 0,
                    duration: 'phase',
                    cannotReady: true,
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
