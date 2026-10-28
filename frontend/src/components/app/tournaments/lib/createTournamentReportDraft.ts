import { creationDocumentSchema } from '../../../../../../shared/creators/contracts.ts';
import { createArticleTemplate } from '../../../../../../shared/posts/templates.ts';
import { emptyPostDocument } from '../../../../../../shared/posts/content.ts';
import type { TournamentReport } from '../../../../../../shared/types/TournamentReport.ts';
import type { TournamentStringDate } from '../../../../../../types/Tournament.ts';
import { formatDataById } from '../../../../../../types/Format.ts';

export type TournamentDraftOptions =
  | { kind: 'article' }
  | { kind: 'report'; useTemplate: boolean; report?: TournamentReport };

export function createTournamentReportDraft(
  tournament: Pick<
    TournamentStringDate,
    'id' | 'name' | 'date' | 'format' | 'attendance' | 'imported'
  >,
  options: TournamentDraftOptions = { kind: 'report', useTemplate: true },
) {
  const isReport = options.kind === 'report';
  const report =
    isReport && options.report?.tournament.id === tournament.id ? options.report : undefined;
  return creationDocumentSchema.parse({
    title: `${tournament.name} — ${isReport ? 'tournament report' : 'article'}`.slice(0, 200),
    medium: 'article',
    body:
      isReport && options.useTemplate
        ? createArticleTemplate(
            'tournament-report',
            report ?? {
              tournament: {
                id: tournament.id,
                name: tournament.name,
                date: tournament.date.slice(0, 10),
                format: formatDataById[tournament.format]?.name ?? null,
                attendance: tournament.attendance,
                completed: tournament.imported,
                placement: null,
                record: null,
              },
              deck: null,
              rounds: [],
              hasMetaDecks: false,
            },
          )
        : emptyPostDocument(),
    tags: isReport ? ['purpose:tournament-report'] : [],
    references: [{ type: 'tournament', id: tournament.id, startSeconds: null }],
    chapters: [],
  });
}
