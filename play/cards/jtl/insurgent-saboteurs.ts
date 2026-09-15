import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in jtl-foundations.json.
export const insurgentSaboteurs = {
  cardId: 'insurgent-saboteurs',
  name: 'Insurgent Saboteurs',
  kind: 'unit',
  aspects: ['Aggression'],
  traits: ['Rebel', 'Trooper'],
  cost: 6,
  power: 6,
  hp: 5,
  arena: 'ground',
  keywords: ['Saboteur'],
  triggers: [
    {
      id: 'remove-upgrade',
      timing: 'attack',
      effects: [
        {
          kind: 'defeat-upgrade',
          optional: true,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
