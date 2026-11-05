import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in early-set-completion.json.
export const earlyCompleteMalevolenceGrievousSSecretWeapon = {
  cardId: 'malevolence--grievous-s-secret-weapon',
  name: "Malevolence, Grievous's Secret Weapon",
  kind: 'unit',
  aspects: ['Vigilance', 'Villainy'],
  traits: ['Separatist', 'Vehicle', 'Capital Ship'],
  cost: 9,
  unique: true,
  power: 7,
  hp: 7,
  arena: 'space',
  exploit: 4,
  restore: 2,
  triggers: [
    {
      id: 'played',
      timing: 'played',
      effects: [
        {
          kind: 'select-unit',
          filter: {
            controller: 'enemy',
          },
          optional: false,
          bind: 'chosen',
          effects: [
            {
              kind: 'on-unit',
              target: 'chosen',
              operation: {
                kind: 'modify',
                power: -4,
                hp: 0,
                duration: 'phase',
                abilities: {
                  cannotAttack: true,
                },
              },
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
