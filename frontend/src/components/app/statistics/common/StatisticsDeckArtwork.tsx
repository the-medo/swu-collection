import {
  LeaderBaseArtwork,
  type LeaderBaseArtworkProps,
} from '@/components/app/global/LeaderBaseArtwork.tsx';

/** Keep the statistics row sizing while sharing the portrait and base treatment. */
export function StatisticsDeckArtwork(
  props: Pick<LeaderBaseArtworkProps, 'leaderId' | 'baseKey' | 'side'>,
) {
  return (
    <LeaderBaseArtwork
      {...props}
      className="statistics-deck-artwork @max-[380px]/statistics-leader:h-19 @max-[380px]/statistics-leader:w-24 @max-[320px]/statistics-match:h-19 @max-[320px]/statistics-match:w-22"
      portraitClassName="@max-[380px]/statistics-leader:h-17.5 @max-[380px]/statistics-leader:w-21.5 @max-[320px]/statistics-match:h-17.5 @max-[320px]/statistics-match:w-21.5"
    />
  );
}
