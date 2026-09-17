import { activityBases, activityLeaders } from './activity.ts';
import type {
  CrossfireBookmark,
  CrossfireProblemReport,
} from '../../../shared/types/crossfire-activity.ts';
import { reportDescriptionSchema } from '../../../play/view/chat.ts';
import { historyHandle } from '../../../play/history/handles.ts';
import type { Sql } from 'postgres';
import { z } from 'zod';
import { bookmarkLabelSchema } from '../../../play/view/bookmarks.ts';
import type { Bookmark } from '../../../play/view/bookmarks.ts';
import type { ReplayPosition } from '../../../play/view/replay.ts';
import { replayPositionSchema } from '../../../play/view/replay.ts';
import { principalSchema, requireSession, AdmissionError } from './lobbies.ts';
import type { Principal } from './lobbies.ts';
import { requireConnection } from './connections.ts';
import type { ConnectionGrant } from './connections.ts';
import { encodeReportCapture, type ReportCapture } from './reportSnapshot.ts';
import type { ProblemReportDetail } from '../../../shared/types/crossfire-reports.ts';

export class CrossfireBookmarks {
  constructor(private readonly sql: Sql) {}
  async list(raw: Principal): Promise<CrossfireBookmark[]> {
    const p = principalSchema.parse(raw);
    return this.sql.begin('read only', async tx => {
      await requireSession(tx, p);
      const rows =
        await tx`SELECT b.id,b.game_id,b.position,b.branch,b.label,b.created_at,l.id AS lobby_id,g.history_key,g.sequence,
        ${activityLeaders(tx, p.userId)} AS leaders,
        ${activityBases(tx, p.userId)} AS bases,
        (g.status = 'finalized' AND EXISTS (SELECT 1 FROM play.participants p WHERE p.lobby_id = l.id AND p.user_id = ${p.userId})) AS can_practice,
        (l.allow_spectators OR EXISTS (SELECT 1 FROM play.participants p WHERE p.lobby_id = l.id AND p.user_id = ${p.userId})) AS available
        FROM play.bookmarks b JOIN play.lobbies l ON l.game_id = b.game_id JOIN play.games g ON g.id = b.game_id
        WHERE b.user_id = ${p.userId} ORDER BY b.created_at DESC,b.id DESC LIMIT 300`;
      return rows.map(r => ({
        id: r.id,
        position: r.position,
        branch: r.branch,
        label: r.label,
        createdAt: r.created_at.toISOString(),
        lobbyId: r.lobby_id,
        available: r.available,
        leaders: r.available ? r.leaders : null,
        bases: r.available ? r.bases : null,
        canPractice:
          r.can_practice &&
          r.position !== historyHandle(r.history_key, r.game_id, 'position', r.sequence),
      }));
    });
  }
  /** The worker supplies a verified position from its current authorized cursor. */
  async create(
    grant: ConnectionGrant,
    id: string,
    label: string,
    position: ReplayPosition,
    report?: string,
    capture?: ReportCapture,
  ): Promise<Bookmark> {
    z.uuid().parse(id);
    label = bookmarkLabelSchema.parse(label);
    replayPositionSchema.parse(position);
    if (report !== undefined) report = reportDescriptionSchema.parse(report);
    const snapshot = report !== undefined ? encodeReportCapture(capture, grant.gameId) : undefined;
    return this.sql.begin(async tx => {
      await tx`SELECT pg_advisory_xact_lock(hashtextextended(${grant.userId}, 257))`;
      await requireConnection(tx, grant, true);
      const [old] = await tx`SELECT * FROM play.bookmarks WHERE id = ${id}`;
      if (old) {
        if (
          old.user_id !== grant.userId ||
          old.game_id !== grant.gameId ||
          old.position !== position.position ||
          old.branch !== position.branch ||
          old.label !== label
        )
          throw new AdmissionError('conflict');
      } else {
        const [count] =
          await tx`SELECT count(*)::int AS n FROM play.bookmarks WHERE user_id = ${grant.userId}`;
        if (count!.n >= 300) throw new AdmissionError('conflict');
        await tx`INSERT INTO play.bookmarks (id,user_id,game_id,position,branch,label)
          VALUES (${id},${grant.userId},${grant.gameId},${position.position},${position.branch},${label})`;
      }
      if (report !== undefined) {
        const [prior] =
          await tx`SELECT user_id,description,game_id,position,branch,label FROM play.problem_reports WHERE id = ${id}`;
        if (
          prior &&
          (prior.user_id !== grant.userId ||
            prior.description !== report ||
            prior.game_id !== grant.gameId ||
            prior.position !== position.position ||
            prior.branch !== position.branch ||
            prior.label !== label)
        )
          throw new AdmissionError('conflict');
        if (!prior) {
          const [count] =
            await tx`SELECT count(*)::int AS n FROM play.problem_reports WHERE user_id = ${grant.userId}`;
          if (count!.n >= 100) throw new AdmissionError('conflict');
          await tx`INSERT INTO play.problem_reports(id,user_id,game_id,position,branch,label,description,checkpoint,checkpoint_hash,snapshot)
            VALUES (${id},${grant.userId},${grant.gameId},${position.position},${position.branch},${label},${report},${snapshot!.checkpoint},${snapshot!.hash},${tx.json(snapshot!.snapshot)})`;
          await tx`INSERT INTO play.report_notifications(report_id) VALUES (${id})`;
        }
      }
      const [row] = await tx`SELECT created_at FROM play.bookmarks WHERE id = ${id}`;
      return {
        id,
        lobbyId: grant.lobbyId,
        position: position.position,
        branch: position.branch,
        label,
        createdAt: row!.created_at.toISOString(),
        available: true,
      };
    });
  }
  async reports(raw: Principal): Promise<CrossfireProblemReport[]> {
    const p = principalSchema.parse(raw);
    return this.sql.begin('read only', async tx => {
      await requireSession(tx, p);
      const rows =
        await tx`SELECT r.id,r.position,r.branch,r.label,r.description,r.status,r.created_at,l.id AS lobby_id,
        ${activityLeaders(tx, p.userId)} AS leaders,
        ${activityBases(tx, p.userId)} AS bases,
        (l.allow_spectators OR EXISTS(SELECT 1 FROM play.participants p WHERE p.lobby_id=l.id AND p.user_id=${p.userId})) AS available
        FROM play.problem_reports r JOIN play.lobbies l ON l.game_id=r.game_id
        WHERE r.user_id=${p.userId} ORDER BY r.created_at DESC,r.id DESC LIMIT 100`;
      return rows.map(r => ({
        id: r.id,
        lobbyId: r.lobby_id,
        position: r.position,
        branch: r.branch,
        label: r.label,
        description: r.description,
        status: r.status,
        createdAt: r.created_at.toISOString(),
        available: r.available,
        leaders: r.available ? r.leaders : null,
        bases: r.available ? r.bases : null,
      }));
    });
  }
  /** reviewer is supplied by the HTTP admin permission check, never a request field. */
  async report(raw: Principal, id: string, reviewer = false): Promise<ProblemReportDetail> {
    const p = principalSchema.parse(raw);
    z.uuid().parse(id);
    return this.sql.begin('read only', async tx => {
      await requireSession(tx, p);
      const [row] =
        await tx`SELECT r.id,r.position,r.branch,r.label,r.description,r.status,r.created_at,r.snapshot,l.id AS lobby_id
        FROM play.problem_reports r JOIN play.lobbies l ON l.game_id=r.game_id
        WHERE r.id=${id} AND (r.user_id=${p.userId} OR ${reviewer})`;
      if (!row) throw new AdmissionError('unavailable');
      return {
        id: row.id,
        lobbyId: row.lobby_id,
        position: row.position,
        branch: row.branch,
        label: row.label,
        description: row.description,
        status: row.status,
        createdAt: row.created_at.toISOString(),
        snapshot: row.snapshot,
      };
    });
  }
  async resolveReport(raw: Principal, id: string) {
    const p = principalSchema.parse(raw);
    z.uuid().parse(id);
    await this.sql.begin(async tx => {
      await requireSession(tx, p);
      const rows =
        await tx`UPDATE play.problem_reports SET status='resolved' WHERE id=${id} AND user_id=${p.userId} RETURNING id`;
      if (!rows.length) throw new AdmissionError('unavailable');
    });
  }
  async rename(raw: Principal, id: string, label: string) {
    const p = principalSchema.parse(raw);
    z.uuid().parse(id);
    label = bookmarkLabelSchema.parse(label);
    await this.sql.begin(async tx => {
      await requireSession(tx, p);
      const rows =
        await tx`UPDATE play.bookmarks SET label = ${label}, updated_at = clock_timestamp() WHERE id = ${id} AND user_id = ${p.userId} RETURNING id`;
      if (!rows.length) throw new AdmissionError('unavailable');
    });
  }
  async remove(raw: Principal, id: string) {
    const p = principalSchema.parse(raw);
    z.uuid().parse(id);
    await this.sql.begin(async tx => {
      await requireSession(tx, p);
      await tx`DELETE FROM play.bookmarks WHERE id = ${id} AND user_id = ${p.userId}`;
    });
  }
}
