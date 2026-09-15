import type { UnitDefinition } from '../definition.ts';

// Official text and clarifications are pinned in sec-effects.json.
export const nalaSeChiefMedicalScientist = {
  cardId: 'nala-se--chief-medical-scientist',
  name: 'Nala Se, Chief Medical Scientist',
  kind: 'unit',
  aspects: ['Vigilance'],
  traits: ['Kaminoan'],
  unique: true,
  cost: 5,
  power: 4,
  hp: 7,
  arena: 'ground',
  triggers: [
    {
      id: 'attack',
      timing: 'attack',
      effects: [
        {
          kind: 'disclose',
          aspects: ['Vigilance', 'Vigilance'],
          effects: [
            {
              kind: 'distribute',
              benefit: 'heal',
              amount: 4,
              filter: {
                otherThan: 'source',
              },
              bind: 'healed',
              effects: [],
            },
          ],
        },
      ],
    },
  ],
} as const satisfies UnitDefinition;
