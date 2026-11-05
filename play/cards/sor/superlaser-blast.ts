import type { EventDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteSuperlaserBlast = {
  cardId: 'superlaser-blast',
  name: 'Superlaser Blast',
  kind: 'event',
  aspects: ['Vigilance', 'Villainy'],
  traits: ['Tactic', 'Disaster'],
  cost: 8,
  effects: [
    {
      kind: 'defeat-units',
      filter: {},
    },
  ],
} as const satisfies EventDefinition;
