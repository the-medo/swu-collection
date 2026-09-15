import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-effects.json.
export const chargedWithEspionage = {
  cardId: 'charged-with-espionage',
  name: 'Charged with Espionage',
  kind: 'event',
  aspects: ['Cunning'],
  traits: ['Law'],
  cost: 2,
  effects: [
    {
      kind: 'disclose',
      aspects: ['Cunning', 'Cunning'],
      effects: [
        {
          kind: 'inspect-zone',
          zone: 'hand',
          player: 'enemy',
          chooser: 'self',
          filter: {
            kind: 'unit',
          },
          min: 1,
          max: 1,
          bind: 'chosen',
          effects: [
            {
              kind: 'move-card',
              target: 'chosen',
              from: 'hand',
              to: 'discard',
            },
          ],
        },
      ],
    },
  ],
} as const satisfies EventDefinition;
