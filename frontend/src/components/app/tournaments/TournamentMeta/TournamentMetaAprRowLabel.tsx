import { memo, useState } from 'react';
import { createPortal } from 'react-dom';
import { LeaderBaseArtwork } from '@/components/app/global/LeaderBaseArtwork.tsx';
import AspectIcon from '@/components/app/global/icons/AspectIcon.tsx';
import SetIcon from '@/components/app/global/icons/SetIcon.tsx';
import { isAspect } from '@/lib/cards/isAspect.ts';
import { cn } from '@/lib/utils.ts';
import { aspectSortValues } from '@/components/app/collections/CollectionContents/CollectionGroups/lib/sortCardsByCardAspects.ts';
import type { MetaInfo } from './MetaInfoSelector.tsx';
import { APR_LABEL_WIDTH, type AprChartItem } from './tournamentMetaAprPresentation.ts';

interface Props {
  x: number;
  y: number;
  item: AprChartItem;
  metaInfo: MetaInfo;
  compact: boolean;
  portal: HTMLDivElement | null;
}

/** Use each chart's tick coordinates, with HTML outside SVG for WebKit artwork support. */
const TournamentMetaAprRowLabel = memo(function TournamentMetaAprRowLabel({
  x,
  y,
  item,
  metaInfo,
  compact,
  portal,
}: Props) {
  const [failedSet, setFailedSet] = useState<string | null>(null);
  const height = compact ? 48 : 80;
  const size = compact ? 'compact' : 'default';
  let artwork;
  if (
    item.key === 'unknown' ||
    item.key === 'no-aspect' ||
    !item.hasArtwork ||
    failedSet === item.key
  ) {
    artwork = <span className="line-clamp-3 break-words">{item.name}</span>;
  } else if (metaInfo === 'leaders') {
    artwork = <LeaderBaseArtwork leaderId={item.key} variant="leader" size={size} />;
  } else if (metaInfo === 'leadersAndBase') {
    const [leaderId, baseKey] = item.key.split('|');
    artwork = <LeaderBaseArtwork leaderId={leaderId} baseKey={baseKey} size={size} />;
  } else if (metaInfo === 'bases') {
    artwork = <LeaderBaseArtwork baseKey={item.key} variant="base" size={size} />;
  } else if (metaInfo === 'sets') {
    artwork = (
      <div
        onErrorCapture={() => setFailedSet(item.key)}
        className={cn(
          'w-28 [&_img]:w-full [&_img]:object-contain',
          compact ? '[&_img]:max-h-8' : '[&_img]:max-h-10',
        )}
      >
        <SetIcon set={item.key} size="full" />
      </div>
    );
  } else {
    const aspects = item.key
      .split('-')
      .filter(isAspect)
      .sort((a, b) => aspectSortValues[a] - aspectSortValues[b]);
    artwork = (
      <div className="flex flex-wrap items-center justify-end gap-1">
        {aspects.map((aspect, index) => (
          <AspectIcon key={`${aspect}-${index}`} aspect={aspect} size="medium" />
        ))}
      </div>
    );
  }

  return (
    portal &&
    createPortal(
      <div
        className="pointer-events-none absolute right-0"
        style={{ left: x - APR_LABEL_WIDTH, top: y - height / 2, height }}
      >
        <div
          data-apr-label={item.key}
          className="pointer-events-auto sticky left-0 flex h-full w-[140px] items-center justify-end bg-card px-3 text-right text-xs text-muted-foreground"
          role="img"
          aria-label={item.name}
          title={item.name}
        >
          <div aria-hidden="true">{artwork}</div>
        </div>
      </div>,
      portal,
      item.key,
    )
  );
});

export default TournamentMetaAprRowLabel;
