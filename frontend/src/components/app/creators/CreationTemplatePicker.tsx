import { useState } from 'react';
import {
  BookOpen,
  ChartNoAxesCombined,
  ChevronDown,
  ChevronRight,
  Layers3,
  LayoutTemplate,
  Trophy,
} from 'lucide-react';
import {
  articleTemplates,
  createArticleTemplate,
  type ArticleTemplateId,
} from '../../../../../shared/posts/templates.ts';
import { isPostEmpty } from '../../../../../shared/posts/content.ts';
import type {
  CreationDocument,
  EntityReference,
} from '../../../../../shared/creators/contracts.ts';
import type { TournamentReport } from '../../../../../shared/types/TournamentReport.ts';
import { TournamentReportTemplateDialog } from './TournamentReportTemplateDialog.tsx';
import { DeckGuideTemplateDialog } from './DeckGuideTemplateDialog.tsx';
import { LimitedGuideTemplateDialog } from './LimitedGuideTemplateDialog.tsx';
import { MetaReportTemplateDialog } from './MetaReportTemplateDialog.tsx';
import type { PreparedArticleTemplate } from './templateControls.tsx';

const icons = {
  'deck-guide': BookOpen,
  'tournament-report': Trophy,
  'limited-guide': Layers3,
  'meta-report': ChartNoAxesCombined,
};

export function CreationTemplatePicker({
  document,
  onApply,
}: {
  document: CreationDocument;
  onApply: (patch: Partial<CreationDocument>) => void;
}) {
  const [open, setOpen] = useState(() => isPostEmpty(document.body));
  const [activeTemplate, setActiveTemplate] = useState<ArticleTemplateId>();
  const [generatedFields, setGeneratedFields] = useState<{
    title?: string;
    references?: EntityReference[];
  }>({});
  function apply(
    id: ArticleTemplateId,
    report?: TournamentReport,
    prepared?: PreparedArticleTemplate,
  ) {
    if (
      !isPostEmpty(document.body) &&
      !window.confirm('Replace the article body with this template?')
    )
      return;
    const patch: Partial<CreationDocument> = {
      body: prepared?.body ?? createArticleTemplate(id, report),
    };
    // Replace only metadata generated in this editing session; preserve the author's edits.
    let title = generatedFields.title === document.title ? '' : document.title;
    let references = document.references.filter(
      ref =>
        !generatedFields.references?.some(
          generated => generated.type === ref.type && generated.id === ref.id,
        ),
    );
    const nextGenerated: typeof generatedFields = {};
    const suggested =
      prepared ??
      (report
        ? {
            title: `${report.tournament.name} — tournament report`.slice(0, 200),
            references: [
              { type: 'tournament' as const, id: report.tournament.id, startSeconds: null },
            ],
          }
        : undefined);
    if (suggested) {
      if (!title.trim()) {
        title = suggested.title;
        nextGenerated.title = title;
      }
      for (const reference of suggested.references)
        if (
          references.length < 50 &&
          !references.some(ref => ref.type === reference.type && ref.id === reference.id)
        ) {
          references = [...references, reference];
          nextGenerated.references = [...(nextGenerated.references ?? []), reference];
        }
    }
    patch.title = title;
    patch.references = references;
    onApply(patch);
    setGeneratedFields(nextGenerated);
    setActiveTemplate(undefined);
    setOpen(false);
  }
  return (
    <>
      <details
        open={open}
        onToggle={event => setOpen(event.currentTarget.open)}
        className="group/templates mb-6 overflow-hidden rounded-2xl border bg-card/60"
      >
        <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-4 outline-offset-[-4px] marker:content-none focus-visible:outline-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden sm:px-5">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <LayoutTemplate className="size-5" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <strong className="block text-sm font-semibold">Start with a template</strong>
            <span className="mt-0.5 block text-xs text-muted-foreground">
              A little structure for your next story. Make every section your own.
            </span>
          </span>
          <ChevronDown
            className="size-4 shrink-0 text-muted-foreground transition-transform group-open/templates:rotate-180"
            aria-hidden="true"
          />
        </summary>
        <div className="divide-y border-t">
          {articleTemplates.map(template => {
            const Icon = icons[template.id];
            return (
              <button
                key={template.id}
                type="button"
                onClick={() => setActiveTemplate(template.id)}
                className="group/row flex w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-primary/5 focus-visible:bg-primary/5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring sm:gap-4 sm:px-5"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border bg-background text-muted-foreground transition-colors group-hover/row:border-primary/30 group-hover/row:text-primary">
                  <Icon className="size-4" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                    <strong className="text-sm font-medium">{template.name}</strong>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-primary">
                      {
                        {
                          'tournament-report': 'FROM YOUR EVENTS',
                          'deck-guide': 'FROM YOUR DECKS',
                          'limited-guide': 'FROM A SET',
                          'meta-report': 'FROM TOURNAMENT DATA',
                        }[template.id]
                      }
                    </span>
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                    {template.description}
                  </span>
                </span>
                <ChevronRight
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
              </button>
            );
          })}
        </div>
      </details>
      {activeTemplate === 'tournament-report' && (
        <TournamentReportTemplateDialog
          onClose={() => setActiveTemplate(undefined)}
          onApply={report => apply('tournament-report', report)}
        />
      )}
      {activeTemplate === 'deck-guide' && (
        <DeckGuideTemplateDialog
          onClose={() => setActiveTemplate(undefined)}
          onBlank={() => apply('deck-guide')}
          onApply={template => apply('deck-guide', undefined, template)}
        />
      )}
      {activeTemplate === 'limited-guide' && (
        <LimitedGuideTemplateDialog
          onClose={() => setActiveTemplate(undefined)}
          onBlank={() => apply('limited-guide')}
          onApply={template => apply('limited-guide', undefined, template)}
        />
      )}
      {activeTemplate === 'meta-report' && (
        <MetaReportTemplateDialog
          onClose={() => setActiveTemplate(undefined)}
          onBlank={() => apply('meta-report')}
          onApply={template => apply('meta-report', undefined, template)}
        />
      )}
    </>
  );
}
