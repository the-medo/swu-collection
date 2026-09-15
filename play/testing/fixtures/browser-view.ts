import type { GameView } from '@swubase/crossfire/view';
export { PROTOCOL_VERSION } from '@swubase/crossfire/view';
export function handCount(view: GameView) {
  return view.players[0]?.handCount ?? 0;
}
