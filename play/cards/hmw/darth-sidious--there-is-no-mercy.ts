import { hmwLeader } from './define.ts';

const retaliate = {
  kind: 'select-target' as const,
  units: { otherThan: 'subject' },
  bases: 'any' as const,
  otherThan: 'subject',
  bind: 'target',
  optional: false,
  effects: [{ kind: 'damage-target' as const, target: 'target', amount: 1 }],
};

const trigger = {
  id: 'damage',
  timing: 'friendly-damage-dealt' as const,
  condition: {
    kind: 'numeric-at-least' as const,
    value: { kind: 'value' as const, name: 'damage' },
    amount: 4,
  },
};

export const hmwDarthSidiousThereIsNoMercy = hmwLeader('darth-sidious--there-is-no-mercy', {
  leader: {
    triggers: [
      {
        ...trigger,
        effects: [
          {
            kind: 'pay',
            optional: true,
            costs: [{ kind: 'exhaust-self' }],
            effects: [retaliate],
          },
        ],
      },
    ],
  },
  unit: {
    keywords: ['Hidden'],
    triggers: [{ ...trigger, optional: true, effects: [retaliate] }],
  },
});
