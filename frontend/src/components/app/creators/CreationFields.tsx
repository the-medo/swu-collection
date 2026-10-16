import type { ReactNode } from 'react';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Textarea } from '@/components/ui/textarea.tsx';
import { Field, selectClass, TagPicker } from './CreatorControls.tsx';
import { creatorPanel, creatorSubheading } from './creatorStyles.ts';
import type { CreationDocument } from '../../../../../shared/creators/contracts.ts';
type Props = { document: CreationDocument; update: (patch: Partial<CreationDocument>) => void };
export function CreationChapters({ document, update }: Props) {
  if (document.medium !== 'video') return null;
  return (
    <section aria-label="Chapters" className={`${creatorPanel} grid gap-3`}>
      <h2 className={creatorSubheading}>Chapters</h2>
      {document.chapters.map((chapter, i) => (
        <div
          key={i}
          className="grid grid-cols-[80px_minmax(0,1fr)] gap-2 sm:grid-cols-[96px_minmax(0,1fr)_auto]"
        >
          <Input
            aria-label={`Chapter ${i + 1} start seconds`}
            type="number"
            min={0}
            value={chapter.startSeconds}
            onChange={e =>
              update({
                chapters: document.chapters.map((c, index) =>
                  index === i ? { ...c, startSeconds: Number(e.target.value) } : c,
                ),
              })
            }
          />
          <Input
            aria-label={`Chapter ${i + 1} title`}
            value={chapter.title}
            onChange={e =>
              update({
                chapters: document.chapters.map((c, index) =>
                  index === i ? { ...c, title: e.target.value } : c,
                ),
              })
            }
          />
          <Button
            variant="ghost"
            className="col-span-2 justify-self-end sm:col-span-1"
            onClick={() =>
              update({ chapters: document.chapters.filter((_, index) => index !== i) })
            }
          >
            Remove
          </Button>
        </div>
      ))}
      <Button
        variant="outline"
        className="justify-self-start"
        onClick={() =>
          update({
            chapters: [
              ...document.chapters,
              {
                startSeconds:
                  (document.chapters[document.chapters.length - 1]?.startSeconds ?? -60) + 60,
                title: '',
              },
            ],
          })
        }
      >
        Add chapter
      </Button>
      <p className="text-xs text-muted-foreground">
        Start times are in seconds, in increasing order.
      </p>
    </section>
  );
}
export function CreationClassification({
  document,
  update,
  creatorOwned,
  children,
}: Props & {
  creatorOwned: boolean;
  children?: ReactNode;
}) {
  return (
    <section
      aria-label="Publishing details"
      className={`${creatorPanel} grid gap-4 sm:grid-cols-2`}
    >
      <h2 className={`${creatorSubheading} sm:col-span-2`}>Publishing details</h2>
      {children}
      <div className="sm:col-span-2">
        <TagPicker
          selected={document.tags}
          onChange={tags => update({ tags })}
          dimensions={['purpose', 'format', 'audience', 'topic', 'environment']}
          compact
        />
      </div>
      <Field label="SWU coverage">
        <select
          className={selectClass}
          value={document.relevance}
          onChange={e => update({ relevance: e.target.value as CreationDocument['relevance'] })}
        >
          <option value="primary">Main topic</option>
          <option value="partial">Part of a broader creation</option>
        </select>
      </Field>
      <Field label="Freshness">
        <select
          className={selectClass}
          value={document.freshness}
          onChange={e => update({ freshness: e.target.value as CreationDocument['freshness'] })}
        >
          <option value="current">Current</option>
          <option value="historical">Historical</option>
        </select>
      </Field>
      <Field label="Season / rules context">
        <Input
          value={document.season}
          onChange={e => update({ season: e.target.value })}
          placeholder="Optional context"
        />
      </Field>
      <Field label="Series">
        <Input
          value={document.series}
          onChange={e => update({ series: e.target.value })}
          placeholder="e.g. Learn to draft"
        />
      </Field>
      <Field label="Position in series">
        <Input
          type="number"
          min={0}
          value={document.seriesOrder}
          onChange={e => update({ seriesOrder: Number(e.target.value) })}
        />
      </Field>
      {creatorOwned && (
        <label className="flex items-center gap-2 text-[12px]">
          <input
            type="checkbox"
            checked={document.pinned}
            onChange={e => update({ pinned: e.target.checked })}
          />
          Pin on creator profile
        </label>
      )}
      <Field label="Sponsorship / affiliate disclosure">
        <Textarea
          value={document.sponsorship}
          onChange={e => update({ sponsorship: e.target.value })}
        />
      </Field>
    </section>
  );
}
