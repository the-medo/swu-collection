import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteShaakTiUnityWinsWars = {
  cardId: 'shaak-ti--unity-wins-wars',
  name: 'Shaak Ti, Unity Wins Wars',
  kind: 'unit',
  aspects: ['Command', 'Heroism'],
  traits: ['Force', 'Jedi', 'Republic'],
  cost: 4,
  unique: true,
  power: 3,
  hp: 4,
  arena: 'ground',
  auras: [
    {
      id: 'aura',
      filter: {
        controller: 'friendly',
        token: true,
      },
      power: 1,
    },
  ],
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'create-unit',
          cardId: 'clone-trooper',
          count: 1,
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
