import { lazy, Suspense, useId, useState, type ReactNode } from 'react';
import { ArrowUpRight, ScanSearch } from 'lucide-react';
import Dialog from '@/components/app/global/Dialog.tsx';
import { useCardList } from '@/api/lists/useCardList.ts';
import type { CardDetailTab } from '@/components/app/cards/CardDetail/cardDetailSearchParams.ts';
import type {
  EntityReference,
  ResolvedReference,
} from '../../../../../shared/creators/contracts.ts';

const CardDetail = lazy(() => import('@/components/app/cards/CardDetail/CardDetail.tsx'));

/** Local card inspection keeps an unsaved editor open without a route transition. */
export function ConnectionLink({
  subject,
  children,
  available = true,
}: {
  subject: Pick<EntityReference, 'type' | 'id'> & Partial<ResolvedReference>;
  children: ReactNode;
  available?: boolean;
}) {
  const { data: catalog } = useCardList();
  const descriptionId = useId();
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<CardDetailTab>('details');
  const [variant, setVariant] = useState<string>();
  const card = ['card', 'leader', 'base'].includes(subject.type);
  const label = subject.label ?? catalog?.cards[subject.id]?.name ?? subject.type;
  const className =
    'flex w-full min-w-0 flex-col items-start gap-2 rounded-lg text-left transition-colors hover:text-[var(--creator-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';
  const content = (
    <>
      <span id={descriptionId} className="flex w-full min-w-0">
        {children}
      </span>
      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-[var(--creator-accent)]">
        {card ? (
          <ScanSearch aria-hidden="true" className="size-3" />
        ) : (
          <ArrowUpRight aria-hidden="true" className="size-3" />
        )}
        Open details
      </span>
    </>
  );
  if (!available) return <div className="min-w-0 flex-1">{children}</div>;
  if (card)
    return (
      <Dialog
        open={open}
        onOpenChange={value => {
          setOpen(value);
          if (!value) {
            setTab('details');
            setVariant(undefined);
          }
        }}
        header={`Card details: ${label}`}
        headerHidden
        size="large"
        contentClassName="w-screen md:max-w-[90%] min-h-[80vh]"
        trigger={
          <button
            type="button"
            className={className}
            aria-label={`Open details: ${subject.type} ${label}`}
            aria-describedby={descriptionId}
          >
            {content}
          </button>
        }
      >
        {open && (
          <Suspense fallback={<p role="status">Loading card details…</p>}>
            <CardDetail
              cardId={subject.id}
              tab={tab}
              variantId={variant}
              onTabChange={setTab}
              onVariantChange={setVariant}
            />
          </Suspense>
        )}
      </Dialog>
    );
  const href =
    subject.href ??
    (subject.type === 'deck'
      ? `/decks/${subject.id}`
      : subject.type === 'tournament'
        ? `/tournaments/${subject.id}`
        : `/cards/sets/${encodeURIComponent(subject.id)}?csCategory=all&csVariant=standard`);
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      aria-label={`Open details: ${subject.type} ${label} (new tab)`}
      aria-describedby={descriptionId}
    >
      {content}
    </a>
  );
}
