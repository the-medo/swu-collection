import React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.tsx';
import { cn } from '@/lib/utils.ts';
import { Kbd } from '@/components/ui/kbd.tsx';
import { getCPDeckKeybindingsInfo } from '@/components/app/limited/CardPoolDeckDetail/useCPDeckKeyboardShortcuts.ts';

export interface CPKeyboardShortcutsTooltipProps {
  className?: string;
}

const CPKeyboardShortcutsTooltip: React.FC<CPKeyboardShortcutsTooltipProps> = ({ className }) => {
  const info = getCPDeckKeybindingsInfo();

  const Row: React.FC<{ keys: string[] | readonly string[]; action: string }> = ({
    keys,
    action,
  }) => (
    <div className="flex items-start gap-2 py-1">
      <div className="min-w-24 flex flex-wrap gap-1 max-w-[95px]">
        {keys.map((k, i) => (
          <Kbd key={i}>{k}</Kbd>
        ))}
      </div>
      <div className="text-xs text-foreground/90">{action}</div>
    </div>
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'text-[11px] text-muted-foreground hover:text-foreground underline underline-offset-2',
            className,
          )}
        >
          (view bindings)
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-3 w-[350px] max-h-[40vh] overflow-y-auto">
        <div className="flex flex-col gap-3">
          <div>
            <div className="font-medium text-sm mb-1">General</div>
            <div className="flex flex-col gap-1">
              {info.general.map((r, idx) => (
                <Row key={idx} keys={r.keys} action={r.action} />
              ))}
            </div>
          </div>

          <div>
            <div className="font-medium text-sm mb-1">Costs</div>
            <div className="flex flex-col gap-1">
              {info.costs.map((r, idx) => (
                <Row key={idx} keys={r.keys} action={r.action} />
              ))}
            </div>
          </div>

          <div>
            <div className="font-medium text-sm mb-1">Aspects</div>
            <div className="grid grid-cols-1 gap-1">
              {info.aspects.map((r, idx) => (
                <Row key={idx} keys={r.keys} action={r.action} />
              ))}
            </div>
          </div>

          <div>
            <div className="font-medium text-sm mb-1">Types</div>
            <div className="grid grid-cols-1 gap-1">
              {info.types.map((r, idx) => (
                <Row key={idx} keys={r.keys} action={r.action} />
              ))}
            </div>
          </div>

          <div>
            <div className="font-medium text-sm mb-1">Grouping</div>
            <div className="flex flex-col gap-1">
              <div className="text-xs text-muted-foreground">Boxes</div>
              {info.grouping.boxes.map((r, idx) => (
                <Row key={`b-${idx}`} keys={r.keys} action={r.action} />
              ))}
              <div className="text-xs text-muted-foreground mt-2">Stacks</div>
              {info.grouping.stacks.map((r, idx) => (
                <Row key={`s-${idx}`} keys={r.keys} action={r.action} />
              ))}
            </div>
          </div>

          <div>
            <div className="font-medium text-sm mb-1">Visibility</div>
            <div className="flex flex-col gap-1">
              {info.visibility.map((r, idx) => (
                <Row key={idx} keys={r.keys} action={r.action} />
              ))}
            </div>
          </div>

          <div className="text-[11px] text-muted-foreground">{info.note}</div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default CPKeyboardShortcutsTooltip;
