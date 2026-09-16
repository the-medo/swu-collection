import { hmwUnit } from './define.ts';

const rescue = {
  kind: 'inspect-zone' as const,
  zone: 'discard' as const,
  player: 'self' as const,
  chooser: 'self' as const,
  filter: { kind: 'unit' as const, withoutTrait: 'Vehicle', notName: 'Boga' },
  min: 0,
  max: 1,
  bind: 'rescued',
  effects: [
    {
      kind: 'grant-discard-play' as const,
      target: 'rescued',
      player: 'self' as const,
      free: false,
      discount: 1,
    },
  ],
};

export const hmwBogaLoyalVaractyl = hmwUnit('boga--loyal-varactyl', {
  triggers: [
    { id: 'played', timing: 'played', effects: [rescue] },
    { id: 'defeated', timing: 'defeated', effects: [rescue] },
  ],
});
