import lightLogo from '@/assets/crossfire/logo-light.svg';
import darkLogo from '@/assets/crossfire/logo-dark.svg';
import { cn } from '@/lib/utils.ts';

/** Decorative mark beside an existing label. The game table always uses dark artwork. */
export function CrossfireLogo({ className, dark = false }: { className?: string; dark?: boolean }) {
  return (
    <span
      data-crossfire-logo
      aria-hidden="true"
      className={cn('inline-flex h-4 w-6 shrink-0 items-center justify-center', className)}
    >
      {!dark && (
        <img
          src={lightLogo}
          alt=""
          width={188}
          height={98}
          draggable={false}
          className="h-full w-full object-contain dark:hidden"
        />
      )}
      <img
        src={darkLogo}
        alt=""
        width={188}
        height={98}
        draggable={false}
        className={cn('h-full w-full object-contain', !dark && 'hidden dark:block')}
      />
    </span>
  );
}
