import { LanguagePicker } from './CreatorLanguages.tsx';
import { lazy, Suspense, useState } from 'react';
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
import { isPostEmpty, postDocumentSchemas } from '../../../../../shared/posts/content.ts';
import { Field, selectClass, Status, SubjectPicker } from './CreatorControls.tsx';
import { ImageField } from './ImageField.tsx';
import { CreationBody } from './CreationPage.tsx';
import { creatorDescription, creatorPanel, creatorTitle } from './creatorStyles.ts';
const PostEditor = lazy(() => import('../rich-text-editor/blocknote/BlocknoteEditor.tsx'));
const templates: Record<string, string[]> = {
  'Deck guide': [
    'Game plan',
    'The decklist',
    'Mulligans and resourcing',
    'Key card choices',
    'Matchups and sideboarding',
  ],
  'Tournament report': [
    'Event and preparation',
    'Deck choice',
    'Rounds and results',
    'What I learned',
  ],
  'Limited guide': [
    'Format and set',
    'Key cards',
    'Archetypes',
    'Draft picks or pool construction',
    'Gameplay advice',
  ],
  'Meta report': ['Events and data sources', 'The field', 'Winning strategies', 'Changes to watch'],
};
export default function CreationEditor({
  creatorId,
  initial,
  onClose,
}: {
  creatorId: string;
  initial?: Creation;
  onClose: () => void;
}) {
  const draft = useCreationDraft({ creatorId, initial, onClose });
  const {
    document,
    id,
    error,
    busy,
    generation,
    setGeneration,
    update,
    resolveConflict,
    restore,
    retry,
  } = draft;
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
        <div className={`${creatorPanel} mx-auto grid max-w-4xl gap-4`}>
          <BadgePreview />
          <h1 className={creatorTitle}>{document.title}</h1>
          {document.medium !== 'video' && <p className={creatorDescription}>{document.summary}</p>}
          <CreationBody document={document} />
        </div>
      ) : (
        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className={`${creatorPanel} space-y-5`}>
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
            {document.medium === 'video' && (
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
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Medium">
                <select
                  className={selectClass}
                  value={document.medium}
                  disabled={initial?.sourceVerified}
                  onChange={e => update({ medium: e.target.value as CreationDocument['medium'] })}
                >
                  {[
                    ['article', 'Article'],
                    ['video', 'Video'],
                    ['audio', 'Podcast / audio'],
                    ['external', 'External resource'],
                  ].map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </Field>
              <LanguagePicker
                selected={[document.language]}
                onChange={languages => update({ language: languages[0] })}
              />
            </div>
            <Field
              label={
                document.medium === 'article'
                  ? 'Original article URL (optional)'
                  : 'Original content URL'
              }
            >
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
            <div className="flex flex-wrap gap-2">
              {Object.keys(templates).map(name => (
                <Button
                  key={name}
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (
                      !isPostEmpty(document.body) &&
                      !window.confirm('Replace the article body with this template?')
                    )
                      return;
                    const body = {
                      version: 1 as const,
                      blocks: templates[name].flatMap(text => [
                        {
                          id: crypto.randomUUID(),
                          type: 'heading',
                          props: { level: 2 },
                          content: [{ type: 'text', text, styles: {} }],
                          children: [],
                        },
                        {
                          id: crypto.randomUUID(),
                          type: 'paragraph',
                          props: {},
                          content: [],
                          children: [],
                        },
                      ]),
                    };
                    update({ body: postDocumentSchemas.rich.parse(body) });
                    setGeneration(g => g + 1);
                  }}
                >
                  {name} template
                </Button>
              ))}
            </div>
            <div className="min-h-72 rounded-xl border bg-card p-4">
              <Suspense fallback={<p>Loading the SWU editor…</p>}>
                <PostEditor
                  key={generation}
                  type="rich"
                  initialContent={document.body}
                  onChange={body => update({ body })}
                />
              </Suspense>
            </div>
            <p className="text-xs text-muted-foreground">
              Use / to insert cards, decklists, matchups and tournament charts. Deck embeds show the
              current deck and respect its access settings.
            </p>
            <SubjectPicker
              references={document.references}
              onChange={references => update({ references })}
            />
            <CreationChapters document={document} update={update} />
          </div>
          <CreationClassification document={document} update={update} />
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
