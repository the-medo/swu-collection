import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in lof-finale.json.
export const quiGonJinnSAetherspriteGuidedByTheForce = {
  cardId: 'qui-gon-jinn-s-aethersprite--guided-by-the-force',
  name: "Qui-Gon Jinn's Aethersprite, Guided by the Force",
  kind: 'unit',
  aspects: ['Cunning', 'Heroism'],
  traits: ['Jedi', 'Republic', 'Vehicle', 'Fighter'],
  unique: true,
  cost: 5,
  power: 3,
  hp: 6,
  arena: 'space',
  triggers: [
    {
      id: 'prepare-repetition',
      timing: 'attack',
      effects: [
        {
          kind: 'schedule-phase-trigger',
          id: 'repeat-next-when-played',
          timing: 'played-ability-used',
          optional: true,
          effects: [
            {
              kind: 'repeat-played-ability',
              index: 'used-played',
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
