import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteSwordAndShieldManeuver = {
  cardId: 'sword-and-shield-maneuver',
  name: 'Sword and Shield Maneuver',
  kind: 'event',
  aspects: ['Heroism'],
  traits: ['Jedi', 'Republic', 'Tactic'],
  cost: 2,
  effects: [
    {
      kind: 'modify-units',
      filter: {
        controller: 'friendly',
        trait: 'Trooper',
      },
      operation: {
        kind: 'modify',
        power: 0,
        hp: 0,
        duration: 'phase',
        abilities: {
          raid: 1,
        },
      },
    },
    {
      kind: 'modify-units',
      filter: {
        controller: 'friendly',
        trait: 'Jedi',
      },
      operation: {
        kind: 'modify',
        power: 0,
        hp: 0,
        duration: 'phase',
        abilities: {
          keywords: ['Sentinel'],
        },
      },
    },
  ],
} as const satisfies EventDefinition;
