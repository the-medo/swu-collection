import { cn } from '@/lib/utils.ts';
import { useId } from 'react';
import { Brush } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.tsx';
import { headerArtworks, headerImageBaseUrl } from './headerArtworks.ts';
import credits from './headerArtworkCredits.json';
import { homepageHeaderLayers } from './homepageHeaderArtwork.ts';

export function HeaderArtworkCredits() {
  const titleId = useId();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'homepage-header-credit-trigger absolute right-2 bottom-1.5 inline-flex items-center gap-[5px] min-h-7',
            'py-1 px-2 border border-[#ffffff30] rounded-[6px] text-[#fffaf0] bg-[#101b2bcc] text-[11px]',
            'cursor-pointer',
            'hover:bg-[#101b2b]',
            'data-[state=open]:bg-[#101b2b]',
            'focus-visible:outline-2 focus-visible:outline-[var(--header-accent)] focus-visible:outline-offset-2',
          )}
          aria-label="Illus. — header illustration credits"
        >
          <Brush size={13} aria-hidden="true" />
          Illus.
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={10}
        aria-labelledby={titleId}
        className={cn(
          'homepage-header-credits w-80 max-w-[calc(100vw-32px)] rounded-xl p-4',
          'motion-reduce:animate-none!',
        )}
      >
        <h2 id={titleId} className="m-0! p-0! border-0! text-[14px]! font-semibold! leading-[1.5]!">
          Header illustrations
        </h2>
        <ul className="mt-3 grid list-none gap-3 p-0">
          {homepageHeaderLayers.map(({ image: key }) => (
            <li key={key} className="flex items-center gap-3">
              <img
                src={`${headerImageBaseUrl}/${headerArtworks[key].thumbnailKey}`}
                alt=""
                className="size-11 shrink-0 rounded-md object-cover"
                loading="lazy"
              />
              <div className="min-w-0">
                <p className="m-0 text-xs font-medium">{credits[key].artist}</p>
                <p className="m-0 mt-1 text-xs leading-relaxed text-muted-foreground">
                  {headerArtworks[key].name}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
