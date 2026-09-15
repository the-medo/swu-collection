import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-effects.json.
export const focusDeterminesReality = {
  cardId: 'focus-determines-reality',
  name: 'Focus Determines Reality',
  kind: 'event',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Force'],
  cost: 2,
  effects: [
    {
      kind: 'modify-units',
      filter: {
        controller: 'friendly',
        trait: 'Force',
      },
      operation: {
        kind: 'modify',
        power: 0,
        hp: 0,
        duration: 'phase',
        abilities: {
          raid: 1,
          keywords: ['Saboteur'],
        },
      },
    },
  ],
} as const satisfies EventDefinition;
