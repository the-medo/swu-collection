import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-effects.json.
export const senatorChuchiVoiceForTheVoiceless = {
  cardId: 'senator-chuchi--voice-for-the-voiceless',
  name: 'Senator Chuchi, Voice for the Voiceless',
  kind: 'unit',
  aspects: ['Vigilance', 'Heroism'],
  traits: ['Republic', 'Official'],
  unique: true,
  cost: 3,
  power: 2,
  hp: 5,
  arena: 'ground',
  restore: 1,
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'friendly',
            otherThan: 'source',
            trait: 'Official',
          },
          bind: 'chosen',
          optional: false,
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'modify',
                power: 0,
                hp: 0,
                duration: 'phase',
                abilities: {
                  restore: 2,
                },
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
