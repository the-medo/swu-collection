import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in law-effects.json.
export const doctorAphraDiggingForAnswers = {
  cardId: 'doctor-aphra--digging-for-answers',
  name: 'Doctor Aphra, Digging For Answers',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Underworld'],
  unique: true,
  cost: 4,
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
          player: 'self',
          count: 3,
          bind: 'first',
          group: 'milled',
          effects: [
            {
              kind: 'inspect-zone',
              zone: 'discard',
              player: 'self',
              chooser: 'owner',
              filter: {
                inGroup: 'milled',
                trait: 'Underworld',
              },
              min: 0,
              max: 1,
              bind: 'chosen',
              effects: [
                {
                  kind: 'move-card',
                  target: 'chosen',
                  from: 'discard',
                  to: 'hand',
                },
              ],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
