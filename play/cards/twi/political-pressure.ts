import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompletePoliticalPressure = {
  cardId: 'political-pressure',
  name: 'Political Pressure',
  kind: 'event',
  aspects: ['Cunning'],
  traits: ['Plan'],
  cost: 1,
  effects: [
    {
      kind: 'choose-mode',
      options: [
        {
          id: 'discard',
          effects: [
            {
              kind: 'discard-random-hand',
              player: 'enemy',
            },
          ],
          condition: {
            kind: 'numeric-at-least',
            value: {
              kind: 'zone-size',
              zone: 'hand',
              player: 'enemy',
            },
            amount: 1,
          },
        },
        {
          id: 'droids',
          effects: [
            {
              kind: 'create-unit',
              cardId: 'battle-droid',
              count: 2,
            },
          ],
        },
      ],
      chooser: 'enemy',
    },
  ],
} as const satisfies EventDefinition;
