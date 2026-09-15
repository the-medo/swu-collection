import type { UnitDefinition } from '../definition.ts';
// Attack Ends observes the combat event even if this observer is defeated then.
export const anakinSkywalkerPrescientPodracer = {
  cardId: 'anakin-skywalker--prescient-podracer',
  name: 'Anakin Skywalker, Prescient Podracer',
  kind: 'unit',
  unique: true,
  cost: 2,
  power: 2,
  hp: 4,
  arena: 'ground',
  aspects: ['Vigilance', 'Cunning', 'Heroism'],
  traits: ['Force'],
  triggers: [
    {
      id: 'attack-ended-return',
      timing: 'friendly-attack-ended',
      effects: [
        {
          kind: 'if',
          condition: { kind: 'no-other-unit-attacked', target: 'subject' },
          effects: [
            {
              kind: 'choose-mode',
              options: [
                {
                  id: 'return-attacker',
                  effects: [
                    {
                      kind: 'on-unit',
                      target: 'subject',
                      operation: { kind: 'return-to-hand' },
                      ifYouDo: [{ kind: 'heal-own-base', amount: 2 }],
                    },
                  ],
                },
                { id: 'leave-attacker', effects: [] },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
