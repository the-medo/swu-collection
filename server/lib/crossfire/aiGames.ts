import { randomUUID } from 'node:crypto';
import type { Sql } from 'postgres';
import type { CrossfireCatalogSource } from './catalog.ts';
import {
  AdmissionError,
  prepareCrossfireDeck,
  principalSchema,
  requireSession,
  type Principal,
} from './lobbies.ts';
import { initializeCardBundles, activeCardVersions } from '../../../play/storage/card-bundles.ts';
import { createInitialCheckpoint } from '../../../play/host/durable-game.ts';
import { insertGame, stateDigest } from '../../../play/storage/postgres.ts';
import { createAiGameSchema, type AiOpponents } from '../../../shared/types/crossfire-ai-play.ts';
import { aiVersions } from '../../../shared/types/crossfire-ai-releases.ts';
import { CrossfireAiReleases } from './aiReleases.ts';
import { notifyInvitation } from './invitationEvents.ts';
import { registerMatch } from './matches.ts';
import { aiReplayLimit } from '../../../play/ai/live/retention.ts';

export class CrossfireAiGames {
  constructor(
    private readonly sql: Sql,
    private readonly catalog: CrossfireCatalogSource,
    private readonly releases: CrossfireAiReleases,
  ) {}

  async list(raw: Principal): Promise<AiOpponents> {
    const p = principalSchema.parse(raw);
    await initializeCardBundles(this.sql);
    const limit = await this.sql.begin('read only', async tx => {
      await requireSession(tx, p);
      return aiReplayLimit(tx, p.userId);
    });
    return {
      data: await this.releases.opponents(aiVersions.parse(await activeCardVersions(this.sql))),
      configured: this.releases.configured,
      replayLimit: limit,
    };
  }

  async create(raw: Principal, body: unknown): Promise<{ id: string; gameId: string }> {
    const p = principalSchema.parse(raw),
      input = createAiGameSchema.parse(body);
    await this.sql.begin('read only', tx => requireSession(tx, p));
    const requestHash = stateDigest(JSON.stringify(input));
    const existing = await this.sql`SELECT a.request_hash,l.id,l.game_id FROM play.ai_games a
      JOIN play.lobbies l ON l.game_id=a.game_id WHERE a.owner_id=${p.userId} AND a.request_id=${input.requestId}`;
    if (existing[0]) {
      if (existing[0].request_hash !== requestHash) throw new AdmissionError('conflict');
      return { id: existing[0].id, gameId: existing[0].game_id };
    }
    await initializeCardBundles(this.sql);
    const versions = aiVersions.parse(await activeCardVersions(this.sql));
    // Slow inference/R2 work happens before the admission transaction.
    const pin = await this.releases.pin(input.leaderCardId, input.opponentDeck, versions);
    if (pin.releaseId !== input.releaseId) throw new AdmissionError('conflict');
    const { snapshot: opponent, release } = await this.releases.runtime(pin);
    const deck = release.decks.find(d => d.key === pin.deckKey)!;
    return this.sql.begin(async tx => {
      await tx`SELECT pg_advisory_xact_lock(hashtextextended(${p.userId}, 481))`;
      await requireSession(tx, p, true);
      const [old] = await tx`SELECT a.request_hash,l.id,l.game_id FROM play.ai_games a
        JOIN play.lobbies l ON l.game_id=a.game_id WHERE a.owner_id=${p.userId} AND a.request_id=${input.requestId}`;
      if (old) {
        if (old.request_hash !== requestHash) throw new AdmissionError('conflict');
        return { id: old.id, gameId: old.game_id };
      }
      const [count] =
        await tx`SELECT count(*)::int AS n FROM play.ai_games a JOIN play.games g ON g.id=a.game_id
        WHERE a.owner_id=${p.userId} AND g.status='running'`;
      if (count!.n >= 3) throw new AdmissionError('conflict');
      const own = await prepareCrossfireDeck(tx, p, input.deckId, this.catalog, versions);
      if (!own.ok) throw new AdmissionError('unsupported-deck');
      const id = randomUUID(),
        gameId = `game-${randomUUID()}`;
      const checkpoint = createInitialCheckpoint({
        gameId,
        versions,
        disclosure: { handsToPlayers: false, handsToSpectators: false },
        players: [own.snapshot, opponent].map((d, i) => ({
          id: i ? 'p2' : 'p1',
          leader: d.leader,
          base: d.base,
          deck: d.mainboard,
        })) as Parameters<typeof createInitialCheckpoint>[0]['players'],
      });
      await insertGame(tx, checkpoint);
      await tx`UPDATE play.games SET mode='ai' WHERE id=${gameId}`;
      await tx`INSERT INTO play.lobbies(id,creator_user_id,versions,status,game_id,allow_spectators,hands_to_players,hands_to_spectators,best_of)
        VALUES (${id},${p.userId},${tx.json(versions)},'started',${gameId},false,false,false,1)`;
      await tx`INSERT INTO play.participants(lobby_id,seat,user_id,session_id,deck_snapshot)
        VALUES (${id},'p1',${p.userId},${p.sessionId},${tx.json(own.snapshot)}),
        (${id},'p2',NULL,'ai',${tx.json(opponent)})`;
      await tx`INSERT INTO play.ai_games(game_id,owner_id,request_id,request_hash,release_id,pin,deck_label,release_label)
        VALUES (${gameId},${p.userId},${input.requestId},${requestHash},${pin.releaseId},${tx.json(pin)},${deck.label},${release.label})`;
      await registerMatch(tx, id, checkpoint);
      await notifyInvitation(tx, id);
      return { id, gameId };
    });
  }
}
