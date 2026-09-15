import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { encodeState } from '../../../play/engine/checkpoint.ts';
import type { GameState } from '../../../play/engine/model.ts';
import { gameViewSchema } from '../../../play/view/types.ts';
import type { GameView } from '../../../play/view/types.ts';
import { AdmissionError } from './lobbies.ts';

export type ReportCapture = { state: GameState; view: GameView; seat?: string };
/** Only the worker supplies captures; no HTTP/WS request accepts state or views. */
export function encodeReportCapture(capture: ReportCapture | undefined, gameId: string) {
  if (!capture || capture.state.gameId !== gameId || capture.view.gameId !== gameId)
    throw new AdmissionError('conflict');
  const text = encodeState(capture.state);
  const snapshot = { view: gameViewSchema.parse(capture.view), seat: capture.seat ?? null };
  if (
    Buffer.byteLength(text) > 8 * 1024 * 1024 ||
    Buffer.byteLength(JSON.stringify(snapshot)) > 8 * 1024 * 1024
  )
    throw new AdmissionError('conflict');
  return {
    checkpoint: gzipSync(text),
    hash: createHash('sha256').update(text).digest('hex'),
    snapshot,
  };
}
