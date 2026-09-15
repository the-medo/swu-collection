import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in ash-effects.json.
export const clanVizslaSoldier = {
  cardId: 'clan-vizsla-soldier',
  name: 'Clan Vizsla Soldier',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Mandalorian', 'Trooper'],
  cost: 2,
  power: 2,
  hp: 3,
  arena: 'ground',
  triggers: [
    {
      id: 'defeated',
      timing: 'defeated',
      effects: [
        {
          kind: 'defeat-upgrade',
          optional: true,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
