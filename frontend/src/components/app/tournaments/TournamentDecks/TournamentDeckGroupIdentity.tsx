import { CircleHelp } from 'lucide-react';
import { useCardList } from '@/api/lists/useCardList.ts';
import { LeaderBaseArtwork } from '@/components/app/global/LeaderBaseArtwork.tsx';
import AspectIcon from '@/components/app/global/icons/AspectIcon.tsx';
import SetIcon from '@/components/app/global/icons/SetIcon.tsx';
import { isAspect } from '@/lib/cards/isAspect.ts';
import { processBase } from '../../../../../../shared/lib/processBase.ts';
import { useLabel } from '../TournamentMeta/useLabel.tsx';
import type { MetaInfo } from '../TournamentMeta/MetaInfoSelector.tsx';

interface Props {
  groupKey: string;
  metaInfo: MetaInfo;
  fallbackName?: string;
}

const groupLabels: Record<MetaInfo, string> = {
  leaders: 'Leader',
  leadersAndBase: 'Leader & base',
  bases: 'Base',
  aspects: 'Aspect',
  aspectsBase: 'Base aspect',
  aspectsDetailed: 'Aspect combination',
  sets: 'Leader set',
};

export default function TournamentDeckGroupIdentity({ groupKey, metaInfo, fallbackName }: Props) {
  const { data: cardList } = useCardList();
  const label = useLabel();
  const name =
    fallbackName ??
    (groupKey === 'no-aspect'
      ? 'No aspect'
      : String(label(groupKey, metaInfo, 'text') || groupKey).trim());
  const [leaderKey, baseKey] =
    metaInfo === 'leadersAndBase'
      ? groupKey.split('|')
      : metaInfo === 'leaders'
        ? [groupKey, undefined]
        : metaInfo === 'bases'
          ? [undefined, groupKey]
          : [];
  // Card IDs themselves contain hyphens; resolve a pair against the catalog.
  const firstPairedLeaderId =
    leaderKey && !cardList?.cards[leaderKey]
      ? Object.keys(cardList?.cardsByCardType.Leader ?? {}).find(
          id => leaderKey.startsWith(`${id}-`) && cardList?.cards[leaderKey.slice(id.length + 1)],
        )
      : undefined;
  const leaderIds =
    leaderKey && cardList?.cards[leaderKey]
      ? [leaderKey]
      : firstPairedLeaderId
        ? [firstPairedLeaderId, leaderKey!.slice(firstPairedLeaderId.length + 1)]
        : [];
  const leaders = leaderIds.flatMap(id => (cardList?.cards[id] ? [cardList.cards[id]] : []));
  const leaderSets = [...new Set(leaders.map(leader => leader.set))].join(' / ');
  const base = baseKey ? processBase(baseKey, cardList?.cards) : undefined;
  const baseName = base?.isAnyBasicBase
    ? `${base.aspects.join(' / ')}${base.isBasicForceBase ? ' Force' : base.isBasicAspectIgnoreBase ? ' aspect-ignore' : ''} base`
    : base?.baseCard?.title;
  const title =
    leaders.map(leader => leader.title).join(' & ') ||
    (metaInfo === 'bases' ? baseName : undefined) ||
    name;
  const aspects = groupKey.split('-').filter(isAspect);
  const artwork = leaderIds.length ? (
    <div className="flex shrink-0 flex-col gap-1">
      {leaderIds.map(leaderId => (
        <LeaderBaseArtwork
          key={leaderId}
          leaderId={leaderId}
          baseKey={baseKey}
          variant={baseKey ? 'leader-base' : 'leader'}
          size={leaderIds.length > 1 ? 'compact' : 'default'}
        />
      ))}
    </div>
  ) : baseKey ? (
    <LeaderBaseArtwork baseKey={baseKey} variant="base" />
  ) : metaInfo === 'sets' && groupKey !== 'unknown' ? (
    <div className="w-20 shrink-0">
      <SetIcon set={groupKey} size="full" />
    </div>
  ) : aspects.length ? (
    <div className="flex max-w-24 shrink-0 flex-wrap gap-1 rounded-lg bg-muted/60 p-2">
      {aspects.map((aspect, index) => (
        <AspectIcon key={`${aspect}-${index}`} aspect={aspect} size="medium" />
      ))}
    </div>
  ) : (
    <CircleHelp className="size-10 shrink-0 text-muted-foreground" aria-hidden="true" />
  );

  return (
    <div className="flex items-center gap-3">
      {artwork}
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          <span>{groupLabels[metaInfo]}</span>
          {leaderSets && (
            <span className="rounded border px-1.5 py-0.5 tracking-normal">{leaderSets}</span>
          )}
        </div>
        <p className="text-base font-semibold leading-tight">{title}</p>
        {leaders.map(leader =>
          leader.subtitle ? (
            <p key={leader.cardId} className="mt-1 text-xs leading-snug text-muted-foreground">
              {leader.subtitle}
            </p>
          ) : null,
        )}
        {leaderKey && baseName && <p className="mt-2 text-xs font-medium">{baseName}</p>}
      </div>
    </div>
  );
}
