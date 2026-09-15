import type { EventDefinition } from '../definition.ts';

// SEC 145: official text permits only the normal Play a Card action as the player's first action.
export const confidenceInVictory = {
  cardId: 'confidence-in-victory',
  name: 'Confidence in Victory',
  kind: 'event',
  cost: 10,
  aspects: ['Aggression', 'Villainy'],
  traits: ['Gambit'],
  playOnlyFirstAction: true,
  effects: [
    {
      kind: 'choose-mode',
      options: [
        { id: 'ground', effects: [{ kind: 'schedule-regroup-victory', arena: 'ground' }] },
        { id: 'space', effects: [{ kind: 'schedule-regroup-victory', arena: 'space' }] },
      ],
    },
  ],
} as const satisfies EventDefinition;
