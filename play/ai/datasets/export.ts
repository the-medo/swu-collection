import { createHmac } from 'node:crypto';
import postgres, { type Sql } from 'postgres';
import { PostgresGameStore } from '../../storage/postgres.ts';
import { type AiObjects, sha256 } from '../releases/objects.ts';
import { publishDataset, revokeDataset, type DatasetEntry } from './objects.ts';
import { encodeTrajectory, privateList } from './trajectory.ts';

/** Bounded background work. R2 failures never prevent game finalization. */
export async function exportTrainingGames(
  sql: Sql,
  objects: AiObjects,
  scope?: { gameIds: string[]; exportIds: string[] },
) {
  const gameIds = scope?.gameIds ?? [],
    exportIds = scope?.exportIds ?? [];
  const candidates = await sql`SELECT g.id,coalesce(m.match_id,l.id) AS group_source,
      coalesce(root.history_key,g.history_key) AS group_secret
    FROM play.games g JOIN play.lobbies l ON l.game_id=g.id
    LEFT JOIN play.match_games m ON m.lobby_id=l.id
    LEFT JOIN play.lobbies first ON first.id=m.match_id
    LEFT JOIN play.games root ON root.id=first.game_id
    WHERE (${!scope} OR g.id=ANY(${gameIds})) AND g.status='finalized'
      AND (l.best_of=1 OR (m.match_id IS NOT NULL AND root.history_key IS NOT NULL)) AND NOT EXISTS(SELECT 1 FROM play.ai_training_exports e WHERE e.game_id=g.id)
      AND (SELECT count(*) FROM play.participants p JOIN play.ai_training_consents c ON c.game_id=g.id AND c.user_id=p.user_id
           WHERE p.lobby_id=l.id AND c.allowed AND c.policy=1)=2
    ORDER BY g.updated_at LIMIT 4`;
  for (const row of candidates) {
    const group = createHmac('sha256', row.group_secret)
      .update(`ai-group:${row.group_source}`)
      .digest('hex');
    await sql`INSERT INTO play.ai_training_exports (game_id,group_id) VALUES (${row.id},${group}) ON CONFLICT (game_id) DO NOTHING`;
  }
  // Recheck exported jobs too: account/source deletion and retention revoke them.
  const jobs = await sql`SELECT export_id,game_id FROM play.ai_training_exports
    WHERE (${!scope} OR game_id=ANY(${gameIds}) OR export_id=ANY(${exportIds})) AND purged_at IS NULL AND
      (state='pending' OR state='revoked' OR updated_at<now()-interval '5 minutes')
    ORDER BY CASE WHEN state='revoked' THEN 0 WHEN state='pending' THEN 1
      WHEN state='failed' AND attempts<5 THEN 2 ELSE 3 END,updated_at LIMIT 4`;
  for (const item of jobs) {
    const connection = await sql.reserve();
    const key = `ai-export-worker:${item.export_id}`;
    let held = false;
    let stage: 'history' | 'storage' = 'storage';
    // Session lock serializes workers, while short transactions serialize only
    // consent checks. An R2 request never holds a lock needed by withdrawal.
    const authorize = (completed = false) =>
      sql.begin(async tx => {
        await tx`SELECT pg_advisory_xact_lock(hashtextextended(${`ai-export:${item.game_id ?? item.export_id}`},0))`;
        const [job] =
          await tx`SELECT * FROM play.ai_training_exports WHERE export_id=${item.export_id} FOR UPDATE`;
        if (!job || job.purged_at) return null;
        const players = job.game_id
          ? await tx`SELECT p.user_id FROM play.lobbies l JOIN play.participants p ON p.lobby_id=l.id
        WHERE l.game_id=${job.game_id} FOR SHARE OF p`
          : [];
        const consent = job.game_id
          ? await tx`SELECT user_id,allowed,policy FROM play.ai_training_consents WHERE game_id=${job.game_id} FOR SHARE`
          : [];
        const allowed =
          job.state !== 'revoked' &&
          job.created_at.getTime() + 90 * 86400_000 > Date.now() &&
          players.length === 2 &&
          players.every(
            p =>
              p.user_id &&
              consent.some(c => c.user_id === p.user_id && c.allowed && c.policy === 1),
          );
        if (!allowed) {
          await tx`UPDATE play.ai_training_exports SET state='revoked',updated_at=now() WHERE export_id=${job.export_id}`;
          job.state = 'revoked';
        } else if (completed) {
          await tx`UPDATE play.ai_training_exports SET state='exported',attempts=attempts+1,error=NULL,updated_at=now() WHERE export_id=${job.export_id}`;
          job.state = 'exported';
        } else if (job.state === 'exported' || job.attempts >= 5) {
          // Capped failures still rotate through retention/consent checks.
          await tx`UPDATE play.ai_training_exports SET updated_at=now() WHERE export_id=${job.export_id}`;
        }
        return job;
      });
    const entryFor = (job: Record<string, any>): DatasetEntry => ({
      id: job.export_id,
      groupId: job.group_id,
      checksum: job.checksum,
      state: 'available',
      createdAt: job.created_at.toISOString(),
      expiresAt: new Date(job.created_at.getTime() + 90 * 86400_000).toISOString(),
    });
    const purge = async (job: Record<string, any>) => {
      await revokeDataset(objects, entryFor(job));
      await sql`UPDATE play.ai_training_exports SET state='revoked',purged_at=now(),error=NULL,updated_at=now() WHERE export_id=${job.export_id}`;
    };
    try {
      const [lock] =
        await connection`SELECT pg_try_advisory_lock(hashtextextended(${key},0)) AS acquired`;
      held = !!lock?.acquired;
      if (!held) continue;
      const job = await authorize();
      if (!job) continue;
      if (job.state === 'revoked') {
        await purge(job);
        continue;
      }
      if (job.state === 'exported' || job.attempts >= 5) continue;
      const players =
        await sql`SELECT p.deck_snapshot FROM play.lobbies l JOIN play.participants p ON p.lobby_id=l.id WHERE l.game_id=${job.game_id} ORDER BY p.seat`;
      stage = 'history';
      const { history, key: secret } = await new PostgresGameStore(sql).historySource(job.game_id);
      const decks = players.map(p =>
        privateList.parse({
          leader: p.deck_snapshot.leader,
          base: p.deck_snapshot.base,
          mainboard: p.deck_snapshot.mainboard,
        }),
      );
      const data = encodeTrajectory(
        history,
        { exportId: job.export_id, groupId: job.group_id, createdAt: job.created_at.toISOString() },
        decks,
        secret,
      );
      const checksum = sha256(data);
      if (job.checksum && job.checksum !== checksum) throw new Error('Training export changed');
      stage = 'storage';
      // Receipt committed before upload: a crash cannot orphan an unknown object.
      await sql`UPDATE play.ai_training_exports SET checksum=${checksum} WHERE export_id=${job.export_id} AND checksum IS NULL`;
      const before = await authorize();
      if (!before) continue;
      if (before.state === 'revoked') {
        await purge(before);
        continue;
      }
      await publishDataset(objects, entryFor(before), data);
      // Withdrawal/source deletion may have happened during upload. Its durable
      // state wins, and a killed process leaves the next worker a cleanup receipt.
      const after = await authorize(true);
      if (after?.state === 'revoked') await purge(after);
    } catch (error) {
      // History loading includes DB reads. A driver/network failure is retryable,
      // even when it interrupts decoding; only invalid replay data is quarantined.
      const databaseFailure =
        error instanceof postgres.PostgresError ||
        (error instanceof Error &&
          'code' in error &&
          typeof error.code === 'string' &&
          /^(CONNECTION_|CONNECT_|ECONN|EPIPE|ETIMEDOUT|ENET|EHOST)/.test(error.code));
      const quarantine = stage === 'history' && !databaseFailure;
      const reason = quarantine
        ? 'History quarantined: unsupported undo, integrity failure, or incompatible action adapter'
        : 'Storage unavailable: publication or revocation will be retried';
      await sql`UPDATE play.ai_training_exports SET state=CASE WHEN state='revoked' THEN state ELSE 'failed' END,
        attempts=CASE WHEN ${quarantine} THEN greatest(attempts+1,5) ELSE attempts+1 END,error=${reason},updated_at=now()
        WHERE export_id=${item.export_id} AND purged_at IS NULL`;
    } finally {
      try {
        if (held) await connection`SELECT pg_advisory_unlock(hashtextextended(${key},0))`;
      } finally {
        connection.release();
      }
    }
  }
}
