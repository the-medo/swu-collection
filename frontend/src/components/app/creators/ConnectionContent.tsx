import { selectDefaultVariant } from '../../../../../server/lib/cards/selectDefaultVariant.ts';
import { CalendarDays } from 'lucide-react';
import { connectionTypes } from './connectionTypes.ts';
import { useCardList } from '@/api/lists/useCardList.ts';
import CardImage from '@/components/app/global/CardImage.tsx';
import { DeckArtwork } from '@/components/app/decks/DeckArtwork.tsx';
import { CreatorSetLogo } from './CreatorSetLogo.tsx';
import type {
  ConnectionSubject,
  EntityReference,
} from '../../../../../shared/creators/contracts.ts';

function connectionDate(date: string) {
  return new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', year: 'numeric' }).format(
    new Date(`${date}T12:00:00`),
  );
}

export function ConnectionContent({
  subject,
  pending = false,
}: {
  subject: Pick<EntityReference, 'type' | 'id'> & Partial<ConnectionSubject>;
  pending?: boolean;
}) {
  const { data: catalog } = useCardList();
  const kind = connectionTypes.find(item => item.type === subject.type)!;
  const Icon = kind.icon;
  const card = ['card', 'leader', 'base'].includes(subject.type)
    ? catalog?.cards[subject.id]
    : undefined;
  const label =
    card?.title || subject.label || (pending ? 'Loading connection…' : 'Connection unavailable');
  const subtitle =
    card?.subtitle ||
    (subject.type === 'deck'
      ? [
          subject.leaderId && catalog?.cards[subject.leaderId]?.name,
          subject.baseId && catalog?.cards[subject.baseId]?.name,
        ]
          .filter(Boolean)
          .join(' · ')
      : subject.location);
  const future = subject.date ? subject.date > new Date().toLocaleDateString('en-CA') : false;
  return (
    <span className="flex w-full min-w-0 flex-1 items-start gap-2">
      <span
        aria-hidden="true"
        className="flex min-h-12 w-14 shrink-0 items-center justify-center rounded-lg bg-muted/40"
      >
        {card ? (
          <CardImage
            card={card}
            cardVariantId={selectDefaultVariant(card)}
            forceHorizontal={card.type === 'Leader' || card.type === 'Base'}
            size="w50"
            backSideButton={false}
          />
        ) : subject.type === 'deck' ? (
          <span className="flex h-12 w-14 items-start justify-center pt-2">
            <span className={subject.leader2Id ? 'scale-50' : 'scale-60'}>
              <DeckArtwork
                leaderId={subject.leaderId}
                leader2Id={subject.leader2Id}
                baseId={subject.baseId}
                size="compact"
              />
            </span>
          </span>
        ) : subject.type === 'set' ? (
          <CreatorSetLogo code={subject.id} className="w-14" />
        ) : subject.type === 'tournament' && subject.date ? (
          <span className="flex flex-col items-center text-[var(--creator-accent)]">
            <span className="text-[10px] font-semibold uppercase tracking-wider">
              {new Intl.DateTimeFormat('en', { month: 'short' }).format(
                new Date(`${subject.date}T12:00:00`),
              )}
            </span>
            <span className="text-xl font-semibold leading-tight">
              {Number(subject.date.slice(8, 10))}
            </span>
            <span className="text-[10px] text-muted-foreground">{subject.date.slice(0, 4)}</span>
          </span>
        ) : (
          <Icon className="size-6 text-muted-foreground" />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="mb-1 flex flex-wrap items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {kind.label}
          {future && subject.type === 'tournament' && (
            <span className="rounded bg-[var(--creator-soft)] px-1.5 py-0.5 text-[var(--creator-accent)]">
              Upcoming
            </span>
          )}
        </span>
        <span className="block break-words text-xs font-semibold leading-snug">{label}</span>
        {subtitle && (
          <span className="mt-1 block break-words text-[11px] text-muted-foreground">
            {subtitle}
          </span>
        )}
        {subject.date && (
          <span className="mt-1.5 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <CalendarDays aria-hidden="true" className="size-3 shrink-0" />
            <time dateTime={subject.date}>{connectionDate(subject.date)}</time>
          </span>
        )}
      </span>
    </span>
  );
}
