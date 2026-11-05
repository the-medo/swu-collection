import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteRallyingCry = {
  cardId: 'rallying-cry',
  name: 'Rallying Cry',
  kind: 'event',
  aspects: ['Aggression', 'Aggression'],
  traits: ['Tactic'],
  cost: 3,
  effects: [
    {
      kind: 'modify-units',
      filter: {
        controller: 'friendly',
      },
      operation: {
        kind: 'modify',
        power: 0,
        hp: 0,
        duration: 'phase',
        abilities: {
          raid: 2,
        },
      },
    },
  ],
} as const satisfies EventDefinition;
