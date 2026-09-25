import type { Sql, TransactionSql } from 'postgres';
import { z } from 'zod';
import { AdmissionError, principalSchema, requireSession, type Principal } from './lobbies.ts';
import {
  aiConsentSchema,
  type AiConsentStatus,
} from '../../../shared/types/crossfire-ai-releases.ts';

/** Consent is deliberately per game, separate from replay visibility and sessions. */
export class CrossfireAiConsent {
  constructor(private readonly sql: Sql) {}
  private async status(
    tx: TransactionSql,
    gameId: string,
    userId: string,
  ): Promise<AiConsentStatus> {
    const rows = await tx`SELECT p.user_id,coalesce(c.allowed AND c.policy=1,false) AS allowed
      FROM play.lobbies l JOIN play.participants p ON p.lobby_id=l.id
      LEFT JOIN play.ai_training_consents c ON c.game_id=l.game_id AND c.user_id=p.user_id
      WHERE l.game_id=${gameId}`;
    const own = rows.find(r => r.user_id === userId);
    if (!own) throw new AdmissionError('unavailable');
    const [job] = await tx`SELECT state FROM play.ai_training_exports WHERE game_id=${gameId}`;
    return {
      policy: 1,
      allowed: own.allowed,
      bothAllowed: rows.length === 2 && rows.every(r => r.user_id && r.allowed),
      state: job?.state ?? 'waiting',
    };
  }
  async get(raw: Principal, id: string) {
    const principal = principalSchema.parse(raw),
      gameId = z.string().min(1).max(128).parse(id);
    return this.sql.begin('read only', async tx => {
      await requireSession(tx, principal);
      return this.status(tx, gameId, principal.userId);
    });
  }
  async set(raw: Principal, id: string, body: unknown) {
    const principal = principalSchema.parse(raw),
      gameId = z.string().min(1).max(128).parse(id),
      input = aiConsentSchema.parse(body);
    return this.sql.begin(async tx => {
      await requireSession(tx, principal);
      await tx`SELECT pg_advisory_xact_lock(hashtextextended(${`ai-export:${gameId}`},0))`;
      await this.status(tx, gameId, principal.userId);
      await tx`INSERT INTO play.ai_training_consents (game_id,user_id,allowed,policy) VALUES
        (${gameId},${principal.userId},${input.allowed},1)
        ON CONFLICT (game_id,user_id) DO UPDATE SET allowed=EXCLUDED.allowed,policy=1,updated_at=now()`;
      if (!input.allowed)
        await tx`UPDATE play.ai_training_exports SET state='revoked',updated_at=now() WHERE game_id=${gameId} AND state <> 'revoked'`;
      return this.status(tx, gameId, principal.userId);
    });
  }
}
