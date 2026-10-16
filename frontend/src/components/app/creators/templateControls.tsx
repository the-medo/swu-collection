import { useMemo, useState, type ReactNode } from 'react';
import { Check, ChevronRight, FileText, Layers3, Search } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Checkbox } from '@/components/ui/checkbox.tsx';
import { DeckArtwork } from '@/components/app/decks/DeckArtwork.tsx';
import { useEditorDecks } from '@/api/rich-text-editor/useEditorDecks.ts';
import { getCardImageUrl } from '@/components/app/global/cardImageLib.ts';
import { cn } from '@/lib/utils.ts';
import type { CardList } from '../../../../../lib/swu-resources/types.ts';
import type {
  GuidedArticleTemplate,
  TemplateCard,
} from '../../../../../shared/types/ArticleTemplates.ts';
import { finishGuidedTemplate } from '../../../../../shared/posts/guidedTemplates.ts';

export type PreparedArticleTemplate = ReturnType<typeof finishGuidedTemplate>;
export type TemplateDialogProps = {
  onClose: () => void;
  onApply: (template: PreparedArticleTemplate) => void;
  onBlank: () => void;
};
export function TemplateDialog({
  title,
  description,
  onClose,
  onBlank,
  children,
}: { title: string; description: string; children: ReactNode } & Pick<
  TemplateDialogProps,
  'onClose' | 'onBlank'
>) {
  return (
    <Dialog
      open
      onOpenChange={open => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="flex max-h-[90dvh] w-[calc(100%-1.5rem)] max-w-3xl flex-col gap-0 overflow-hidden rounded-2xl p-0">
        <DialogHeader className="border-b bg-muted/30 px-5 pb-5 pt-6 text-left sm:px-6">
          <span className="mb-3 grid size-11 place-items-center rounded-xl border border-primary/20 bg-primary/10 text-primary">
            <Layers3 className="size-5" />
          </span>
          <DialogTitle className="m-0! border-0! p-0! text-2xl! leading-tight!">
            {title}
          </DialogTitle>
          <DialogDescription className="m-0! text-sm! leading-relaxed!">
            {description}
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 space-y-5 overflow-y-auto p-5 sm:p-6">{children}</div>
        <div className="border-t bg-muted/20 px-5 py-3">
          <Button variant="ghost" onClick={onBlank}>
            Use blank template
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
export function TemplateNotice({
  children,
  error = false,
  retry,
}: {
  children: ReactNode;
  error?: boolean;
  retry?: () => void;
}) {
  return (
    <div
      role={error ? 'alert' : 'status'}
      className={cn('rounded-xl border bg-muted/20 p-4 text-sm', error && 'border-destructive/30')}
    >
      {children}
      {retry && (
        <Button variant="outline" size="sm" className="ml-3" onClick={retry}>
          Try again
        </Button>
      )}
    </div>
  );
}
export function TemplatePreview({
  template,
  onApply,
}: {
  template: GuidedArticleTemplate;
  onApply: TemplateDialogProps['onApply'];
}) {
  const [excluded, setExcluded] = useState<string[]>([]);
  const prepared = useMemo(() => {
    try {
      return {
        data: finishGuidedTemplate(
          template,
          template.sections
            .filter(section => !excluded.includes(section.id))
            .map(section => section.id),
        ),
      };
    } catch {
      return {
        error: 'Choose at least one section. If the article is too large, include fewer sections.',
      };
    }
  }, [template, excluded]);
  return (
    <section
      aria-label="Template preview"
      className="overflow-hidden rounded-xl border bg-muted/20"
    >
      <div className="flex items-center gap-3 border-b p-4">
        <FileText className="size-4 text-primary" />
        <strong className="text-sm">Your article will include</strong>
      </div>
      <div className="divide-y">
        {template.sections.map(section => (
          <label
            key={section.id}
            className="flex cursor-pointer items-start gap-3 p-4 hover:bg-muted/30"
          >
            <Checkbox
              className="mt-1"
              checked={!excluded.includes(section.id)}
              onCheckedChange={checked =>
                setExcluded(previous =>
                  checked ? previous.filter(id => id !== section.id) : [...previous, section.id],
                )
              }
            />
            <span className="min-w-0">
              <strong className="block text-sm">{section.title}</strong>
              <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">
                {section.description}
              </span>
            </span>
          </label>
        ))}
      </div>
      <div className="space-y-3 border-t p-4">
        <p className="text-xs text-muted-foreground">
          Everything stays editable. Toggle sections start open. Applying replaces the current
          article body.
        </p>
        {prepared.error && (
          <p role="alert" className="text-sm text-destructive">
            {prepared.error}
          </p>
        )}
        <Button
          className="w-full sm:w-auto"
          disabled={!prepared.data}
          onClick={() => prepared.data && onApply(prepared.data)}
        >
          Create article <ChevronRight className="ml-2 size-4" />
        </Button>
      </div>
    </section>
  );
}
export function TemplateDeckChooser({
  selected,
  onSelect,
  limitedFormat,
}: {
  selected?: string;
  onSelect: (id: string) => void;
  limitedFormat?: 'Draft' | 'Sealed';
}) {
  const decks = useEditorDecks('mine');
  const [search, setSearch] = useState('');
  if (decks.isPending) return <TemplateNotice>Loading your decks…</TemplateNotice>;
  if (decks.isError)
    return (
      <TemplateNotice error retry={() => void decks.refetch()}>
        Could not load your decks.
      </TemplateNotice>
    );
  const rows = decks.data.pages
    .flatMap(page => page.data)
    .filter(
      ({ deck }) =>
        deck.public === 1 &&
        (!limitedFormat || deck.format === (limitedFormat === 'Sealed' ? 3 : 4)) &&
        deck.name.toLowerCase().includes(search.toLowerCase()),
    );
  return (
    <div className="space-y-3">
      <strong className="block text-sm">
        {limitedFormat ? `Your public ${limitedFormat.toLowerCase()} decks` : 'Your public decks'}
      </strong>
      <Input
        icon={Search}
        aria-label="Find your deck"
        placeholder="Filter loaded decks…"
        value={search}
        onChange={event => setSearch(event.target.value)}
      />
      <div className="max-h-64 space-y-2 overflow-y-auto overscroll-contain p-1">
        {rows.map(({ deck }) => (
          <button
            type="button"
            key={deck.id}
            aria-pressed={selected === deck.id}
            onClick={() => onSelect(deck.id)}
            className={cn(
              'flex min-h-20 w-full items-center gap-4 rounded-xl border bg-card p-4 text-left transition-colors hover:border-primary/50',
              selected === deck.id && 'border-primary bg-primary/5',
            )}
          >
            <DeckArtwork
              leaderId={deck.leaderCardId1}
              leader2Id={deck.leaderCardId2}
              baseId={deck.baseCardId}
              size="compact"
            />
            <strong className="min-w-0 flex-1 break-words text-sm">
              {deck.name || 'Untitled deck'}
            </strong>
            {selected === deck.id && <Check className="size-4 shrink-0" />}
          </button>
        ))}
        {!rows.length && (
          <TemplateNotice>
            No matching public decks loaded. Load more decks, or make a deck public so article
            readers can see it.
          </TemplateNotice>
        )}
        {decks.hasNextPage && (
          <Button
            variant="ghost"
            className="w-full"
            disabled={decks.isFetchingNextPage}
            onClick={() => void decks.fetchNextPage()}
          >
            {decks.isFetchingNextPage ? 'Loading…' : 'Load more decks'}
          </Button>
        )}
      </div>
    </div>
  );
}
export function TemplateCardChoices({
  label,
  cards,
  catalog,
  selected,
  onChange,
  limit = 12,
}: {
  label: string;
  cards: TemplateCard[];
  catalog: CardList;
  selected: string[];
  onChange: (ids: string[]) => void;
  limit?: number;
}) {
  const [search, setSearch] = useState('');
  const filtered = cards.filter(card => card.name.toLowerCase().includes(search.toLowerCase()));
  return (
    <section className="space-y-3" aria-label={label}>
      <div className="flex justify-between gap-2">
        <strong className="text-sm">{label}</strong>
        <span className="text-xs text-muted-foreground">
          {selected.length}/{limit}
        </span>
      </div>
      <Input
        aria-label={`Search ${label.toLowerCase()}`}
        icon={Search}
        placeholder="Find a card…"
        value={search}
        onChange={event => setSearch(event.target.value)}
      />
      <div className="grid max-h-64 gap-2 overflow-y-auto overscroll-contain p-1 sm:grid-cols-2">
        {filtered.map(card => {
          const checked = selected.includes(card.cardId);
          const image = getCardImageUrl(
            catalog[card.cardId]?.variants[card.variantId]?.image.front,
          );
          return (
            <label
              key={card.cardId}
              className={cn(
                'flex cursor-pointer items-center gap-3 rounded-xl border p-2.5',
                checked && 'border-primary bg-primary/5',
              )}
            >
              <Checkbox
                checked={checked}
                disabled={!checked && selected.length >= limit}
                onCheckedChange={value =>
                  onChange(
                    value ? [...selected, card.cardId] : selected.filter(id => id !== card.cardId),
                  )
                }
              />
              {image && (
                <img
                  alt=""
                  src={image}
                  loading="lazy"
                  className="h-12 w-10 shrink-0 rounded object-contain"
                />
              )}
              <span className="min-w-0 text-xs">
                <strong className="block">{card.name}</strong>
                <span className="text-muted-foreground">
                  {card.type} · {card.rarity}
                </span>
              </span>
            </label>
          );
        })}
        {!filtered.length && (
          <p className="p-3 text-sm text-muted-foreground">No matching cards.</p>
        )}
      </div>
    </section>
  );
}
