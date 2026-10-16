import { useResolvedSubjects } from '@/api/creators/useConnectionSubjects.ts';
import { LanguagePicker } from './CreatorLanguages.tsx';
import { useState } from 'react';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Textarea } from '@/components/ui/textarea.tsx';
import { useCreationDraft } from './useCreationDraft.ts';
import { CreationChapters, CreationClassification } from './CreationFields.tsx';
import {
  CreationPublicationControls,
  CreationPublicationFooter,
} from './CreationPublicationControls.tsx';
import { CreationHistory } from './CreationHistory.tsx';
import { type Creation, type CreationDocument } from '../../../../../shared/creators/contracts.ts';
import { SubjectPicker } from './SubjectPicker.tsx';
import { Field, Status } from './CreatorControls.tsx';
import { ImageField } from './ImageField.tsx';
import { CreationBody } from './CreationPage.tsx';
import { creatorDescription, creatorPanel, creatorTitle } from './creatorStyles.ts';
import { ArticleHeader, articleSurface, articleInset, articleBodyInset } from './ArticleHeader.tsx';
import { ArticleEditorHeader } from './ArticleEditorHeader.tsx';
import { CreationBodyEditor } from './CreationBodyEditor.tsx';
import { cn } from '@/lib/utils.ts';
export default function CreationEditor({
  creatorId,
  initial,
  medium = 'article',
  onClose,
}: {
  creatorId: string | null;
  initial?: Creation;
  medium?: CreationDocument['medium'];
  onClose: () => void;
}) {
  const draft = useCreationDraft({ creatorId, initial, medium, onClose });
  const { document, id, error, busy, update, resolveConflict, restore, retry } = draft;
  const resolvedSubjects = useResolvedSubjects(document.references);
  const isArticle = document.medium === 'article';
  const isVideo = document.medium === 'video';
  const [preview, setPreview] = useState(false);
  const [history, setHistory] = useState(false);
  return (
    <div className="min-w-0 space-y-4">
      <CreationPublicationControls
        draft={draft}
        editing={!!initial}
        preview={preview}
        setPreview={setPreview}
      />
      <Status error={error} />
      {initial?.sourceStatus && initial.sourceStatus !== 'active' && (
        <p
          role="status"
          className="rounded-xl border bg-muted/30 p-3 text-sm text-muted-foreground"
        >
          This video is unpublished because it is unavailable, its metadata expired, or access was
          removed. Stored YouTube details were cleared. Your SWUBASE article body remains available.
        </p>
      )}
      {initial?.sourceVerified && (
        <div className="rounded-xl border bg-muted/30 p-3 text-sm text-muted-foreground">
          Edits saved here are marked as manual changes, so future YouTube updates can preserve
          them.
          {!!initial.manuallyEditedFields?.length && (
            <p className="mt-1 text-xs">
              Protected fields:{' '}
              {initial.manuallyEditedFields
                .map(field => field.replace(/([A-Z])/g, ' $1').toLowerCase())
                .join(', ')}
              .
            </p>
          )}
        </div>
      )}
      {error && (error as Error & { status?: number }).status === 409 && id ? (
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" disabled={busy} onClick={() => void resolveConflict(false)}>
            Load saved draft
          </Button>
          <Button variant="outline" disabled={busy} onClick={() => void resolveConflict(true)}>
            Save my version instead
          </Button>
        </div>
      ) : (
        error && (
          <Button variant="outline" onClick={retry}>
            Retry saving
          </Button>
        )
      )}
      {preview ? (
        isArticle ? (
          <article className={articleSurface} aria-label="Article preview">
            <ArticleHeader
              coverUrl={document.coverUrl}
              title={document.title}
              summary={document.summary}
              tags={document.tags}
            >
              <BadgePreview />
            </ArticleHeader>
            <div className={articleBodyInset}>
              <CreationBody document={document} references={resolvedSubjects.data} />
            </div>
          </article>
        ) : (
          <div className={`${creatorPanel} mx-auto grid max-w-4xl gap-4`}>
            <BadgePreview />
            <h1 className={creatorTitle}>{document.title}</h1>
            {!isVideo && <p className={creatorDescription}>{document.summary}</p>}
            <CreationBody document={document} references={resolvedSubjects.data} />
          </div>
        )
      ) : (
        <div className={cn('space-y-4', isArticle && 'mx-auto max-w-5xl')}>
          {isArticle ? (
            <article className={articleSurface} aria-label="Article editor">
              <ArticleEditorHeader document={document} update={update} />
              <div className={articleInset}>
                <CreationBodyEditor draft={draft} />
              </div>
            </article>
          ) : (
            <section className={`${creatorPanel} space-y-5`} aria-label="Content editor">
              <Field label="Title">
                <Input
                  value={document.title}
                  maxLength={200}
                  onChange={e => update({ title: e.target.value })}
                  placeholder="What will your audience learn?"
                />
              </Field>
              <Field label="Summary">
                <Textarea
                  value={document.summary}
                  maxLength={1000}
                  onChange={e => update({ summary: e.target.value })}
                />
              </Field>
              {isVideo && (
                <Field label="Video description">
                  <Textarea
                    value={document.videoDescription ?? ''}
                    placeholder="Uses the summary when empty."
                    maxLength={20000}
                    rows={10}
                    onChange={event => update({ videoDescription: event.target.value })}
                  />
                </Field>
              )}
              <Field label="Original content URL">
                <Input
                  type="url"
                  value={document.sourceUrl}
                  disabled={initial?.sourceVerified}
                  onChange={e => update({ sourceUrl: e.target.value })}
                  placeholder="https://…"
                />
              </Field>
              <ImageField
                label="Cover image"
                value={document.coverUrl}
                onChange={coverUrl => update({ coverUrl })}
              />
              <CreationBodyEditor draft={draft} />
            </section>
          )}
          <SubjectPicker
            resolved={resolvedSubjects}
            references={document.references}
            timestamps={isVideo}
            onChange={references => update({ references })}
          />
          {isVideo && <CreationChapters document={document} update={update} />}
          <CreationClassification
            document={document}
            update={update}
            creatorOwned={!!draft.activeCreatorId}
          >
            <LanguagePicker
              selected={[document.language]}
              onChange={languages => update({ language: languages[0] })}
            />
            {isArticle && (
              <Field label="Original article URL (optional)">
                <Input
                  type="url"
                  value={document.sourceUrl}
                  onChange={e => update({ sourceUrl: e.target.value })}
                  placeholder="https://…"
                />
              </Field>
            )}
          </CreationClassification>
        </div>
      )}
      <CreationPublicationFooter draft={draft} setHistory={setHistory} />
      {history && id && <CreationHistory id={id} restore={restore} />}
    </div>
  );
}
function BadgePreview() {
  return (
    <p className="m-0! text-[10px]! font-semibold uppercase tracking-widest text-[var(--creator-accent)]">
      Private preview
    </p>
  );
}
