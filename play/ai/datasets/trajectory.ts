import { gzipSync, gunzipSync } from 'node:zlib';
import { z } from 'zod';
import { verifyHistory, type History } from '../../history/records.ts';
import { Projector } from '../../projection/projector.ts';
import { inputSchema } from '../../engine/model.ts';
import { catalogFor } from '../../cards/catalog.ts';
import type { GameView, ViewCommand } from '../../view/types.ts';
import { aiHash, aiVersions } from '../../../shared/types/crossfire-ai-releases.ts';
import { sha256 } from '../releases/objects.ts';

const card = z.string().min(1).max(120);
export const privateList = z.strictObject({
  leader: card,
  base: card,
  mainboard: z
    .array(z.strictObject({ cardId: card, quantity: z.number().int().min(1).max(120) }))
    .min(1)
    .max(120),
});
export const trajectoryHeader = z.strictObject({
  schema: z.literal(1),
  policy: z.literal(1),
  exportId: z.uuid(),
  groupId: aiHash,
  createdAt: z.iso.datetime(),
  expiresAt: z.iso.datetime(),
  versions: aiVersions,
  titles: z.record(card, z.string().min(1).max(240)),
  players: z.tuple([
    z.strictObject({ seat: z.literal('p1'), deck: privateList }),
    z.strictObject({ seat: z.literal('p2'), deck: privateList }),
  ]),
  result: z.strictObject({
    winner: z.enum(['p1', 'p2']).nullable(),
    reason: z.enum(['base-defeat', 'concession', 'card-effect']),
  }),
});
export type Trajectory = z.infer<typeof trajectoryHeader> & {
  frames: { seat: 'p1' | 'p2'; view: GameView; command?: ViewCommand }[];
};
export const MAX_TRAJECTORY = 64_000_000;
export function encodeTrajectory(
  history: History,
  metadata: { exportId: string; groupId: string; createdAt: string },
  decks: unknown[],
  projectionSecret: string,
): Buffer {
  // An undo requires a separate branch-aware learning policy. Quarantine these
  // games explicitly rather than teaching choices that were later withdrawn.
  if (history.journal.some(e => e.control))
    throw new Error('Training export excludes undo histories');
  const projectors = ['p1', 'p2'].map(
    playerId =>
      new Projector(
        history.gameId,
        { role: 'player', playerId, showRevealedHands: false },
        sha256(`${projectionSecret}:${metadata.exportId}`),
      ),
  );
  const seen = [new Set<string>(), new Set<string>()];
  const frames: Trajectory['frames'] = [];
  let bytes = 0;
  const verified = verifyHistory(history, (before, _after, entry) => {
    if (before.seats.join(',') !== 'p1,p2') throw new Error('Unsupported training seats');
    const input = inputSchema.parse(entry.inputs[0]);
    for (const [index, seat] of (['p1', 'p2'] as const).entries()) {
      const projector = projectors[index]!;
      const original = projector.project(before);
      const command =
        input.type === 'decision' && input.playerId === seat
          ? projector.projectDecision(before, input)
          : undefined;
      const view = {
        ...original,
        gameId: metadata.exportId,
        events: original.events.filter(e => !seen[index]!.has(e.id)),
      };
      for (const event of view.events) seen[index]!.add(event.id);
      const frame = {
        seat,
        view,
        ...(command ? { command: { ...command, gameId: metadata.exportId } } : {}),
      };
      bytes += Buffer.byteLength(JSON.stringify(frame));
      if (bytes > MAX_TRAJECTORY - 2_000_000 || frames.length >= 20_000)
        throw new Error('Training trajectory exceeds capacity');
      frames.push(frame);
    }
  });
  if (!verified.state.result) throw new Error('Training export requires a terminal game');
  const header = trajectoryHeader.parse({
    schema: 1,
    policy: 1,
    ...metadata,
    expiresAt: new Date(Date.parse(metadata.createdAt) + 90 * 86400_000).toISOString(),
    versions: history.versions,
    titles: catalogFor(verified.state).data.titles,
    players: ['p1', 'p2'].map((seat, i) => ({ seat, deck: privateList.parse(decks[i]) })),
    result: verified.state.result,
  });
  const raw = Buffer.from(JSON.stringify({ ...header, frames }));
  if (raw.length > MAX_TRAJECTORY) throw new Error('Training trajectory exceeds capacity');
  const compressed = gzipSync(raw);
  if (compressed.length > 8_000_000)
    throw new Error('Compressed training trajectory exceeds capacity');
  return compressed;
}
export function decodeTrajectory(bytes: Buffer, checksum: string): Trajectory {
  if (bytes.length > 8_000_000 || sha256(bytes) !== checksum)
    throw new Error('Training trajectory integrity mismatch');
  const raw = JSON.parse(gunzipSync(bytes, { maxOutputLength: MAX_TRAJECTORY }).toString());
  const { frames, ...header } = raw;
  const data = trajectoryHeader.parse(header);
  if (!Array.isArray(frames) || frames.length > 20_000 || !frames.length)
    throw new Error('Invalid training trajectory');
  for (const frame of frames) {
    if (
      !['p1', 'p2'].includes(frame.seat) ||
      frame.view?.gameId !== data.exportId ||
      (frame.command && frame.command.gameId !== data.exportId) ||
      Object.keys(frame).some(k => !['seat', 'view', 'command'].includes(k))
    )
      throw new Error('Invalid trajectory frame');
  }
  return { ...data, frames };
}
