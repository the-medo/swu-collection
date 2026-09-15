import type { LeaderDefinition } from '../definition.ts';

// Printed roles and official clarifications are pinned in leader-combat.json.
export const cassianAndorClimb = {
  cardId: 'cassian-andor--climb-',
  name: 'Cassian Andor, Climb!',
  kind: 'leader',
  aspects: ['Aggression', 'Heroism'],
  traits: ['Rebel'],
  unique: true,
  printedCost: 6,
  faces: {
    leader: {
      protectFromAttackUnlessSentinel: [
        {
          controller: 'friendly',
          dealtBaseDamage: true,
        },
      ],
      actions: [
        {
          id: 'deploy',
          costs: [],
          limit: 'once-per-game',
          effects: [
            {
              kind: 'deploy',
              as: 'unit',
              condition: {
                kind: 'resources-at-least',
                amount: 6,
              },
            },
          ],
        },
      ],
    },
    unit: {
      power: 6,
      hp: 2,
      arena: 'ground',
      keywords: ['Overwhelm'],
      constant: [
        {
          condition: {
            kind: 'initiative',
          },
          abilities: {
            surviveZeroHp: true,
            enemyAbilityImmunity: ['defeat'],
          },
        },
      ],
    },
  },
} as const satisfies LeaderDefinition;
