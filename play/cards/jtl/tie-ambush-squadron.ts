import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-effects.json.
export const tieAmbushSquadron = {
  cardId: 'tie-ambush-squadron',
  name: 'TIE Ambush Squadron',
  kind: 'unit',
  aspects: ['Command', 'Villainy'],
  traits: ['Imperial', 'Vehicle', 'Fighter'],
  cost: 4,
  power: 2,
  hp: 3,
  arena: 'space',
  keywords: ['Ambush'],
  triggers: [
    {
      id: 'launch-on-play',
      timing: 'played',
      effects: [
        {
          kind: 'create-unit',
          cardId: 'tie-fighter',
          count: 1,
        },
      ],
    },
    {
      id: 'launch-on-defeat',
      timing: 'defeated',
      effects: [
        {
          kind: 'create-unit',
          cardId: 'tie-fighter',
          count: 1,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
