import * as Slider from '@radix-ui/react-slider';
import { useEffect, useRef, useState } from 'react';
import { addDays, format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button.tsx';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.tsx';
import { mapPinLogo, mapWeekSummaries, weekLabel } from './mapData.ts';

export function WeekRangeSlider({
  weeks,
  summaries,
  value,
  onChange,
  onCommit,
}: {
  weeks: string[];
  summaries: ReturnType<typeof mapWeekSummaries>;
  value: [number, number];
  onChange: (value: [number, number]) => void;
  onCommit: (value: [number, number]) => void;
}) {
  const disabled = weeks.length < 2;
  const [openWeek, setOpenWeek] = useState<string | null>(null);
  const indicators = summaries.map(summary => ({
    ...summary,
    majorTypes: [...new Set(summary.majors.map(tournament => tournament.type))],
  }));
  const logoRows = Math.max(0, ...indicators.map(indicator => indicator.majorTypes.length));
  const boundaryLabel = (index: number) => {
    const week = weeks[value[index]];
    return week
      ? format(addDays(parseISO(week), index === 0 ? 0 : 6), 'MMM d, yyyy')
      : 'No weeks available';
  };
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium" id="map-weeks-label">
          Week range
        </span>
        <Button
          variant="link"
          size="sm"
          className="h-auto p-0"
          disabled={!weeks.length}
          onClick={() => onCommit([0, weeks.length - 1])}
        >
          All weeks
        </Button>
      </div>
      <div className="flex justify-between gap-4 text-sm" aria-live="polite">
        <span className="max-w-[48%]">{boundaryLabel(0)}</span>
        <span className="max-w-[48%] text-right">{boundaryLabel(1)}</span>
      </div>
      <div className="relative pb-2" style={{ paddingTop: 8 + logoRows * 26 }}>
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
          {indicators.map((indicator, index) => (
            <WeekIndicator
              key={indicator.week}
              indicator={indicator}
              index={index}
              weekCount={weeks.length}
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
  indicator: { week, count, majors, majorTypes },
  index,
  weekCount,
  onCommit,
  open,
  onOpenChange,
}: {
  indicator: ReturnType<typeof mapWeekSummaries>[number] & { majorTypes: string[] };
  index: number;
  weekCount: number;
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
          aria-label={`${weekLabel(week)}: ${countLabel}`}
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
          {majorTypes.length > 0 && (
            <span aria-hidden="true" className="absolute bottom-9 flex flex-col gap-0.5">
              {majorTypes.map(type => (
                <img
                  key={type}
                  src={mapPinLogo(type)}
                  alt=""
                  width={24}
                  height={24}
                  draggable={false}
                  className="size-6 max-w-none object-contain drop-shadow-[0_1px_2px_#0009]"
                />
              ))}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        className="w-auto max-w-xs p-3 text-sm"
        aria-label={weekLabel(week)}
        onOpenAutoFocus={event => event.preventDefault()}
        onCloseAutoFocus={event => event.preventDefault()}
        onPointerEnter={keepOpen}
        onPointerLeave={closeSoon}
        onPointerDown={event => event.stopPropagation()}
        onKeyDown={event => event.stopPropagation()}
      >
        <div className="font-medium">{weekLabel(week)}</div>
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
