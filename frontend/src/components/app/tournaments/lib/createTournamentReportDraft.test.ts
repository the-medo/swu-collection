import { describe, expect, test } from 'bun:test';
import { creationDocumentSchema } from '../../../../../../shared/creators/contracts.ts';
import { isPostEmpty, postPlainText } from '../../../../../../shared/posts/content.ts';
import type { TournamentReport } from '../../../../../../shared/types/TournamentReport.ts';
import { createTournamentReportDraft } from './createTournamentReportDraft.ts';

const tournament = {
  id: '23c2be81-9e08-4570-af46-ba53866c0d77',
  name: 'Community Open',
  date: '2026-10-10T00:00:00.000Z',
  format: 1,
  attendance: 47,
  imported: true,
};

const report: TournamentReport = {
  tournament: { ...tournament, format: 'Premier', placement: 4, record: '5-2-0', completed: true },
  deck: {
    id: '33333333-3333-4333-8333-333333333333',
    name: 'My tournament deck',
    leaderId: null,
    baseId: null,
    hasDecklist: true,
  },
  rounds: [
    {
      round: 1,
      opponentName: 'Opponent One',
      opponentDeck: null,
      outcome: 'win',
      games: { wins: 2, losses: 1, draws: 0 },
      record: { wins: 1, losses: 0, draws: 0 },
    },
  ],
  hasMetaDecks: true,
};

describe('report drafts started from a tournament', () => {
  test('connects a valid article to the event without inventing a player result', () => {
    const draft = createTournamentReportDraft(tournament);
    expect(creationDocumentSchema.safeParse(draft).success).toBe(true);
    expect(draft.medium).toBe('article');
    expect(draft.references).toEqual([
      { type: 'tournament', id: tournament.id, startSeconds: null },
    ]);
    expect(draft.tags).toContain('purpose:tournament-report');
    const text = postPlainText(draft.body);
    expect(text).toContain('Community Open');
    expect(text).toContain('2026-10-10');
    expect(text).toContain('47 players');
    expect(text).toContain('Pre-tournament & preparation');
    expect(text).not.toContain('Finished #');
    expect(text).not.toContain('Record:');
  });

  test('long event names fit the article title contract and retain the event connection', () => {
    const draft = createTournamentReportDraft({ ...tournament, name: 'Tournament '.repeat(30) });
    expect(draft.title.length).toBe(200);
    expect(draft.references[0].id).toBe(tournament.id);
    expect(creationDocumentSchema.safeParse(draft).success).toBe(true);
  });

  test('unknown attendance does not become a zero-player result in a saved draft', () => {
    const draft = createTournamentReportDraft({ ...tournament, attendance: 0, imported: false });
    const text = postPlainText(draft.body);
    expect(text).toContain(tournament.name);
    expect(text).not.toContain('0 players');
    expect(text).not.toContain('Finished #');
  });

  test('prefills the template from the linked player’s report for this event', () => {
    const draft = createTournamentReportDraft(tournament, {
      kind: 'report',
      useTemplate: true,
      report,
    });
    expect(creationDocumentSchema.safeParse(draft).success).toBe(true);
    expect(postPlainText(draft.body)).toContain('Finished #4');
    expect(postPlainText(draft.body)).toContain('Record: 5-2-0');
    expect(JSON.stringify(draft.body)).toContain(report.deck!.id);
    expect(JSON.stringify(draft.body)).toContain('vs. Opponent One');
    expect(JSON.stringify(draft.body)).toContain('meta-analysis');
  });

  test('blank reports retain their classification and event without prefilling results', () => {
    const draft = createTournamentReportDraft(tournament, {
      kind: 'report',
      useTemplate: false,
      report,
    });
    expect(isPostEmpty(draft.body)).toBe(true);
    expect(draft.tags).toContain('purpose:tournament-report');
    expect(draft.references[0].id).toBe(tournament.id);
    expect(creationDocumentSchema.safeParse(draft).success).toBe(true);
  });

  test('articles start empty and linked to the event without being classified as a report', () => {
    const draft = createTournamentReportDraft(tournament, { kind: 'article' });
    expect(isPostEmpty(draft.body)).toBe(true);
    expect(draft.title).toBe('Community Open — article');
    expect(draft.tags).not.toContain('purpose:tournament-report');
    expect(draft.references[0].id).toBe(tournament.id);
    expect(creationDocumentSchema.safeParse(draft).success).toBe(true);
  });

  test('never includes results from a different tournament in this event’s draft', () => {
    const draft = createTournamentReportDraft(tournament, {
      kind: 'report',
      useTemplate: true,
      report: {
        ...report,
        tournament: { ...report.tournament, id: '44444444-4444-4444-8444-444444444444' },
      },
    });
    expect(postPlainText(draft.body)).not.toContain('Finished #4');
    expect(JSON.stringify(draft.body)).not.toContain(report.deck!.id);
    expect(draft.references[0].id).toBe(tournament.id);
  });
});
