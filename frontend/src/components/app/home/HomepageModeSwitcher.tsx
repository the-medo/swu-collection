import { cn } from '@/lib/utils.ts';
import { useNavigate } from '@tanstack/react-router';
import { ChartNoAxesCombined, Layers3, Radio } from 'lucide-react';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group.tsx';
import SocialButtons from '@/components/app/global/SocialButtons.tsx';
import type { HomepageMode } from './homepageTypes.ts';
import { useCurrentWeekend } from './useCurrentWeekend.ts';

type HomepageModeSwitcherProps = {
  activeMode: HomepageMode;
};

export function HomepageModeSwitcher({ activeMode }: HomepageModeSwitcherProps) {
  const navigate = useNavigate();
  const weekendDate = useCurrentWeekend();

  const setUrlMode = (mode: string) => {
    if (mode !== 'snapshot' && mode !== 'today' && mode !== 'live') return;

    navigate({
      to: '/',
      search: previous => ({
        ...previous,
        homeMode: mode,
        poolDate: undefined,
        poolDiscussion: undefined,
        poolComment: undefined,
      }),
    });
  };

  return (
    <nav
      className={cn(
        'homepage-menu-row [--home-menu-accent:#805e19] [--home-menu-tint:#f7f0dc]',
        '[--home-menu-border:#dcc687] [--home-weekend-accent:#267144] [--home-weekend-tint:#edf7ef]',
        '[--home-weekend-border:#a5cdb1] @container/homepage-navigation w-full max-w-380 my-0 mx-auto px-4',
        'pt-2 pb-0',
        'dark:[--home-menu-accent:#f1d48b] dark:[--home-menu-tint:#302a1b] dark:[--home-menu-border:#6a5730]',
        'dark:[--home-weekend-accent:#97dfaf] dark:[--home-weekend-tint:#1c3025]',
        'dark:[--home-weekend-border:#3d6b4c]',
        'max-mobile:px-2 max-mobile:pt-1 max-mobile:pb-0',
      )}
      aria-label="Homepage sections"
    >
      <div
        className={cn(
          'homepage-menu-bar flex items-center gap-3 w-full p-1.5 border border-border rounded-[18px] bg-card',
          'shadow-[0_4px_16px_-12px_#19150930]',
          '@max-[760.01px]/homepage-navigation:gap-2 @max-[760.01px]/homepage-navigation:p-1',
          '@max-[760.01px]/homepage-navigation:rounded-[12px]',
          '@max-[520.01px]/homepage-navigation:flex-col @max-[520.01px]/homepage-navigation:items-stretch',
          '@max-[520.01px]/homepage-navigation:gap-1',
        )}
      >
        <ToggleGroup
          type="single"
          value={activeMode}
          onValueChange={setUrlMode}
          className={cn(
            'homepage-menu grid flex-1 min-w-0 grid-cols-3 gap-[5px] m-0',
            '@max-[760.01px]/homepage-navigation:gap-[3px]',
          )}
          aria-label="Homepage mode"
        >
          {[
            {
              value: 'snapshot',
              label: 'Two-week Meta',
              hint: 'Results & trends',
              icon: ChartNoAxesCombined,
            },
            { value: 'today', label: 'Today', hint: 'Pools, decks & community', icon: Layers3 },
            { value: 'live', label: 'Live Weekend', hint: 'Follow the action', icon: Radio },
          ].map(({ value, label, hint, icon: Icon }) => (
            <ToggleGroupItem
              key={value}
              value={value}
              className={cn(
                'homepage-mode flex justify-start gap-3 h-auto min-h-15.5 min-w-0 py-2.5 px-4 border',
                'border-transparent rounded-[12px] text-muted-foreground bg-transparent text-left',
                'transition-[background,border-color,color] duration-150 ease-[ease]',
                'hover:bg-muted/50 hover:text-foreground',
                'data-[state=on]:border-[color:var(--home-menu-border)] data-[state=on]:bg-[var(--home-menu-tint)]',
                'data-[state=on]:text-[color:var(--home-menu-accent)]',
                'data-[state=on]:shadow-[0_2px_5px_-3px_#19150930]',
                'data-[weekend=true]:border-[color:var(--home-weekend-border)]',
                'data-[weekend=true]:bg-[var(--home-weekend-tint)]',
                'data-[weekend=true]:text-[color:var(--home-weekend-accent)]',
                'data-[weekend=true]:animate-homepage-weekend-glow',
                '[&[data-weekend=true][data-state=on]]:border-[color:var(--home-weekend-accent)]',
                '[&[data-weekend=true]:hover]:border-[color:var(--home-weekend-accent)]',
                '[&[data-weekend=true]_.homepage-mode-icon]:border-[color:var(--home-weekend-border)]',
                'focus-visible:outline-2 focus-visible:outline-[var(--home-menu-accent)]',
                'focus-visible:outline-offset-2',
                '@max-[760.01px]/homepage-navigation:flex-col @max-[760.01px]/homepage-navigation:justify-center',
                '@max-[760.01px]/homepage-navigation:gap-0.5 @max-[760.01px]/homepage-navigation:min-h-11.5',
                '@max-[760.01px]/homepage-navigation:py-[5px] @max-[760.01px]/homepage-navigation:px-[3px]',
                '@max-[760.01px]/homepage-navigation:rounded-[8px] @max-[760.01px]/homepage-navigation:text-center',
                'motion-reduce:transition-none motion-reduce:animate-none',
                'motion-reduce:data-[weekend=true]:animate-none',
                'motion-reduce:data-[weekend=true]:shadow-[0_0_6px_#49ad7125]',
              )}
              data-weekend={value === 'live' && weekendDate ? 'true' : undefined}
              aria-label={label}
            >
              <span
                className={cn(
                  'homepage-mode-icon grid flex-[0_0_34px] w-8.5 h-8.5 place-items-center border border-border/60',
                  'rounded-[10px] bg-background/65',
                  '@max-[760.01px]/homepage-navigation:basis-auto @max-[760.01px]/homepage-navigation:w-4.5',
                  '@max-[760.01px]/homepage-navigation:h-4.5 @max-[760.01px]/homepage-navigation:border-0',
                  '@max-[760.01px]/homepage-navigation:bg-transparent',
                  '@max-[760.01px]/homepage-navigation:[&_svg]:w-4 @max-[760.01px]/homepage-navigation:[&_svg]:h-4',
                )}
              >
                <Icon size={19} strokeWidth={1.7} />
              </span>
              <span className="homepage-mode-copy grid gap-[3px] min-w-0">
                <span
                  className={cn(
                    'homepage-mode-label text-[13px] font-semibold whitespace-nowrap',
                    '@max-[760.01px]/homepage-navigation:text-[11px]',
                  )}
                >
                  {label}
                </span>
                <span
                  className={cn(
                    'homepage-mode-hint text-[10px] font-normal opacity-80',
                    '@max-[760.01px]/homepage-navigation:hidden',
                  )}
                >
                  {hint}
                </span>
              </span>
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <div
          className={cn(
            'homepage-menu-social shrink-0 pl-3 border-l border-l-border',
            '@max-[520.01px]/homepage-navigation:px-0 @max-[520.01px]/homepage-navigation:pt-[3px]',
            '@max-[520.01px]/homepage-navigation:pb-0 @max-[520.01px]/homepage-navigation:border-l-0',
            '@max-[520.01px]/homepage-navigation:border-t @max-[520.01px]/homepage-navigation:border-solid',
            '@max-[520.01px]/homepage-navigation:border-t-border',
            '@max-[520.01px]/homepage-navigation:[&_>_div]:justify-center',
          )}
        >
          <SocialButtons location="header" />
        </div>
      </div>
    </nav>
  );
}
