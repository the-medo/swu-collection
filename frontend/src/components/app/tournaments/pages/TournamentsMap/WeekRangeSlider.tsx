import * as Slider from '@radix-ui/react-slider';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button.tsx';
import { cn } from '@/lib/utils.ts';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.tsx';
import { mapPinColor, mapPinLogo, mapWeekEnd, mapWeekSummaries, weekLabel } from './mapData.ts';
import { TournamentPinDetails } from './TournamentPinDetails.tsx';
import { savedMarkerStackHeight, savedTournamentMarkers } from './savedTournamentMarkers.ts';
import type { MapTournament } from '../../../../../../../types/TournamentMap.ts';

export function WeekRangeSlider({
  weeks,
  windowEnd,
  summaries,
  value,
  onChange,
  onCommit,
}: {
  weeks: string[];
  windowEnd?: string;
  summaries: ReturnType<typeof mapWeekSummaries>;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  onCommit: (value: [number, number]) => void;
}) {
  const disabled = weeks.length < 2;
  const [openWeek, setOpenWeek] = useState<string | null>(null);
  const markerHeight = Math.max(
    0,
    ...summaries.map(
      summary =>
        (summary.majors.length + summary.highlights.length) * 26 +
        (summary.savedTournaments.length
          ? savedMarkerStackHeight(summary.savedTournaments.length) + 2
          : 0),
    ),
  );
  const boundaryLabel = (index: number) => {
    const week = weeks[value[index]];
    return week
      ? format(parseISO(index === 0 ? week : mapWeekEnd(week, windowEnd)), 'MMM d, yyyy')
      : 'No weeks available';
  };
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-sm font-medium" id="map-weeks-label">
            Week range
          </span>
          <span className="flex flex-wrap gap-x-1 text-sm text-muted-foreground" aria-live="polite">
            <span>{boundaryLabel(0)}</span>
            <span aria-hidden="true">–</span>
            <span>{boundaryLabel(1)}</span>
          </span>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-7 shrink-0 px-2 text-xs"
          disabled={!weeks.length}
          onClick={() => onCommit([0, weeks.length - 1])}
        >
          All weeks
        </Button>
      </div>
      <div className="relative pb-2" style={{ paddingTop: 8 + markerHeight }}>
        {summaries.map((summary, index) => {
          const fraction = index / Math.max(1, weeks.length - 1);
          return (
            <div
              key={summary.week}
              className="absolute bottom-10 z-30 flex -translate-x-1/2 flex-col gap-0.5"
              style={{ left: `calc(${fraction * 100}% + ${10 - fraction * 20}px)` }}
            >
              {summary.savedTournaments.length > 0 && (
                <div
                  role="group"
                  aria-label={`Your tournaments: ${weekLabel(summary.week, windowEnd)}`}
                  className="relative w-6"
                  style={{ height: savedMarkerStackHeight(summary.savedTournaments.length) }}
                >
                  {summary.savedTournaments.map((saved, savedIndex) => (
                    <div
                      key={saved.tournamentId}
                      className="absolute left-0 size-6 hover:z-50! focus-within:z-50!"
                      style={{
                        top:
                          (savedIndex *
                            (savedMarkerStackHeight(summary.savedTournaments.length) - 24)) /
                          Math.max(1, summary.savedTournaments.length - 1),
                        zIndex: summary.savedTournaments.length - savedIndex,
                      }}
                    >
                      <HighlightMarker
                        label={`${savedTournamentMarkers[saved.status].label}: ${saved.tournament.name}`}
                        tournament={saved.tournament}
                        marker={
                          <svg
                            aria-hidden="true"
                            data-save-status={saved.status}
                            viewBox="0 0 40 40"
                            className="size-full overflow-visible drop-shadow-[0_1px_2px_#0009]"
                          >
                            <path
                              d={savedTournamentMarkers[saved.status].path}
                              fill={mapPinColor(saved.tournament.format, index, weeks.length)}
                              stroke="white"
                              strokeWidth={1.5}
                              strokeLinejoin="round"
                            />
                          </svg>
                        }
                      />
                    </div>
                  ))}
                </div>
              )}
              {summary.majors.map(tournament => (
                <HighlightMarker
                  key={tournament.id}
                  label={tournament.name}
                  image={mapPinLogo(tournament.type)!}
                  tournament={tournament}
                />
              ))}
              {summary.highlights.map(highlight => (
                <HighlightMarker
                  key={highlight.id}
                  label={highlight.description}
                  image={highlight.imageUrl}
                  custom
                >
                  <div className="flex items-start gap-3">
                    <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-neutral-900 p-2">
                      <img src={highlight.imageUrl} alt="" className="size-full object-contain" />
                    </div>
                    <div className="min-w-0 space-y-2">
                      <div className="text-sm font-medium">
                        {format(parseISO(highlight.date), 'EEE, MMM d, yyyy')}
                      </div>
                      <p className="whitespace-pre-wrap break-words text-sm">
                        {highlight.description}
                      </p>
                    </div>
                  </div>
                </HighlightMarker>
              ))}
            </div>
          );
        })}
        <Slider.Root
          className="relative flex h-7 w-full touch-none select-none items-center [&>span:has([role=slider])]:z-20"
          aria-labelledby="map-weeks-label"
          min={0}
          max={Math.max(1, weeks.length - 1)}
          step={1}
          minStepsBetweenThumbs={0}
          value={value}
          disabled={disabled}
          onValueChange={([start, end]) => onChange([start, end])}
          onValueCommit={([start, end]) => onCommit([start, end])}
        >
          <Slider.Track className="relative h-2 w-full grow rounded-full bg-secondary">
            <Slider.Range className="absolute h-full rounded-full bg-primary" />
          </Slider.Track>
          {summaries.map((indicator, index) => (
            <WeekIndicator
              key={indicator.week}
              indicator={indicator}
              index={index}
              weekCount={weeks.length}
              windowEnd={windowEnd}
              onCommit={onCommit}
              open={openWeek === indicator.week}
              onOpenChange={open =>
                setOpenWeek(current =>
                  open ? indicator.week : current === indicator.week ? null : current,
                )
              }
            />
          ))}
          {['First week', 'Last week'].map((label, index) => (
            <Slider.Thumb
              key={label}
              aria-label={label}
              aria-disabled={disabled}
              aria-valuetext={boundaryLabel(index)}
              className="relative z-20 block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
            />
          ))}
        </Slider.Root>
      </div>
    </div>
  );
}

function WeekIndicator({
  indicator: { week, count, majors },
  index,
  weekCount,
  windowEnd,
  onCommit,
  open,
  onOpenChange,
}: {
  indicator: ReturnType<typeof mapWeekSummaries>[number];
  index: number;
  weekCount: number;
  windowEnd?: string;
  onCommit: (value: [number, number]) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const action = useRef<HTMLButtonElement>(null);
  const keepOpen = () => {
    clearTimeout(closeTimer.current);
    onOpenChange(true);
  };
  const closeSoon = () => {
    closeTimer.current = setTimeout(() => onOpenChange(false), 250);
  };
  useEffect(() => () => clearTimeout(closeTimer.current), []);
  const fraction = index / Math.max(1, weekCount - 1);
  const countLabel = `${count} ${count === 1 ? 'tournament' : 'tournaments'}`;
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={`${weekLabel(week, windowEnd)}: ${countLabel}`}
          className="group absolute -bottom-2 z-10 flex h-11 w-5 -translate-x-1/2 items-center justify-center rounded-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring"
          style={{ left: `calc(${fraction * 100}% + ${10 - fraction * 20}px)` }}
          onPointerEnter={keepOpen}
          onPointerLeave={closeSoon}
          onKeyDown={event => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              event.stopPropagation();
              keepOpen();
              requestAnimationFrame(() => action.current?.focus());
            }
          }}
        >
          <span
            aria-hidden="true"
            className="h-3 w-[3px] rounded-full bg-foreground/40 transition-colors group-hover:bg-foreground"
          />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        className="w-auto max-w-xs p-3 text-sm"
        aria-label={weekLabel(week, windowEnd)}
        onOpenAutoFocus={event => event.preventDefault()}
        onCloseAutoFocus={event => event.preventDefault()}
        onPointerEnter={keepOpen}
        onPointerLeave={closeSoon}
        onPointerDown={event => event.stopPropagation()}
        onKeyDown={event => event.stopPropagation()}
      >
        <div className="font-medium">{weekLabel(week, windowEnd)}</div>
        <div>{countLabel}</div>
        {majors.length > 0 && (
          <ul className="mt-1 space-y-0.5 border-t pt-1 text-xs">
            {majors.map(tournament => (
              <li key={tournament.id}>{tournament.name}</li>
            ))}
          </ul>
        )}
        <Button
          ref={action}
          size="sm"
          variant="outline"
          className="mt-2 h-7 text-xs"
          onClick={() => {
            onCommit([index, index]);
            onOpenChange(false);
          }}
        >
          Filter to this week
        </Button>
      </PopoverContent>
    </Popover>
  );
}

function HighlightMarker({
  label,
  image,
  marker,
  tournament,
  custom = false,
  children,
}: {
  label: string;
  image?: string;
  marker?: ReactNode;
  tournament?: MapTournament;
  custom?: boolean;
  children?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const content = useRef<HTMLDivElement>(null);
  const confirmationOpen = useRef(false);
  const onRemovalConfirmationChange = useCallback((open: boolean) => {
    confirmationOpen.current = open;
    clearTimeout(timer.current);
  }, []);
  const changeOpen = (open: boolean) => {
    if (!confirmationOpen.current) setOpen(open);
  };
  const keepOpen = () => {
    clearTimeout(timer.current);
    setOpen(true);
  };
  const closeSoon = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => changeOpen(false), 250);
  };
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <Popover open={open} onOpenChange={changeOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className={cn(
            'size-6 rounded-sm focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring',
            custom && 'rounded-full border border-white/20 bg-neutral-900 p-0.5 shadow-sm',
          )}
          onPointerEnter={keepOpen}
          onPointerLeave={closeSoon}
          onClick={event => {
            event.preventDefault();
            keepOpen();
          }}
          onKeyDown={event => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              keepOpen();
              requestAnimationFrame(() =>
                (content.current?.querySelector('a') ?? content.current)?.focus(),
              );
            }
          }}
        >
          {marker ?? (
            <img
              src={image}
              alt=""
              width={24}
              height={24}
              draggable={false}
              className="size-full max-w-none object-contain drop-shadow-[0_1px_2px_#0009]"
            />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        ref={content}
        tabIndex={-1}
        side="top"
        className="w-80 max-w-[calc(100vw-2rem)] p-3"
        aria-label={label}
        onOpenAutoFocus={event => event.preventDefault()}
        onCloseAutoFocus={event => event.preventDefault()}
        onPointerEnter={keepOpen}
        onPointerLeave={closeSoon}
      >
        {tournament ? (
          <TournamentPinDetails
            tournaments={[tournament]}
            onRemovalConfirmationChange={onRemovalConfirmationChange}
          />
        ) : (
          children
        )}
      </PopoverContent>
    </Popover>
  );
}
