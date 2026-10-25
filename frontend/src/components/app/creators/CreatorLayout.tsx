import type { ReactNode } from 'react';
import { cn } from '@/lib/utils.ts';
import { creatorTheme, creatorTitle } from './creatorStyles.ts';
import { workspaceStyles } from '../global/WorkspacePage/workspaceStyles.ts';

export function CreatorLayout({
  children,
  fullWidth = false,
  compact = false,
}: {
  children: ReactNode;
  fullWidth?: boolean;
  compact?: boolean;
}) {
  return (
    <div
      data-creator-layout
      className={cn(
        creatorTheme,
        'mx-auto flex w-full min-w-0 flex-col gap-5 px-2 pt-2 pb-10 sm:px-4',
        !fullWidth && 'max-w-380',
        compact && [workspaceStyles.theme, 'gap-3 pb-6'],
      )}
    >
      {children}
    </div>
  );
}

export function CreatorHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <header className="relative overflow-hidden rounded-[20px] border border-[#344c43] bg-[#17352e] px-6 py-8 text-[#fffaf0] sm:px-8 sm:py-10">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,#79936b30,transparent_65%)]"
      />
      <div className="relative flex flex-wrap items-end justify-between gap-6">
        <div className="grid min-w-0 max-w-3xl gap-3">
          <p className="m-0! text-[10px]! font-semibold uppercase leading-normal! tracking-[0.18em] text-[#dce7a0]">
            {eyebrow}
          </p>
          <h1 className={creatorTitle}>{title}</h1>
          {description && (
            <p className="m-0! max-w-2xl text-[13px]! leading-[1.8]! text-[#fffaf0]/80">
              {description}
            </p>
          )}
        </div>
        {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
      </div>
    </header>
  );
}

export function CreatorAvatar({
  name,
  src,
  className,
}: {
  name: string;
  src?: string | null;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'relative flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-card bg-[var(--creator-soft)] text-xl font-semibold text-[var(--creator-accent)]',
        className,
      )}
      aria-hidden="true"
    >
      {src ? (
        <img
          referrerPolicy="no-referrer"
          loading="lazy"
          src={src}
          alt=""
          className="h-full w-full object-cover"
        />
      ) : (
        name.trim().slice(0, 2).toUpperCase()
      )}
    </div>
  );
}
