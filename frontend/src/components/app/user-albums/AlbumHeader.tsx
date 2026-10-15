import type { ReactNode } from 'react';
import { Images } from 'lucide-react';

export function AlbumHeader({
  eyebrow,
  title,
  description,
  metadata,
  titleAction,
  actions,
  cover,
  heading = 'h2',
}: {
  eyebrow: string;
  title: string;
  description?: string;
  metadata?: ReactNode;
  titleAction?: ReactNode;
  actions?: ReactNode;
  cover?: string;
  heading?: 'h1' | 'h2';
}) {
  const Heading = heading;
  return (
    <header className="relative isolate overflow-hidden rounded-[20px] border border-[#326149] bg-[#17352e] text-[#fffaf0]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 -z-10 w-2/3 sm:w-1/2"
      >
        {cover ? (
          <img src={cover} alt="" className="size-full object-cover opacity-40" />
        ) : (
          <div className="flex h-full items-center justify-end pr-8 text-[#dce7a0]/10">
            <Images className="size-40 -rotate-12" strokeWidth={0.8} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-[#17352e] via-[#17352e]/60 to-[#17352e]/20" />
      </div>
      <div className="space-y-5 p-6 sm:p-8">
        <p className="m-0! text-[10px]! font-semibold uppercase tracking-[0.2em] text-[#dce7a0]">
          {eyebrow}
        </p>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <Heading className="m-0! min-w-0 break-words border-0! p-0! text-[28px]! font-semibold! leading-tight! tracking-[-0.04em]! sm:text-[36px]!">
              {title}
            </Heading>
            {titleAction}
          </div>
          {metadata && (
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#fffaf0]/75 [overflow-wrap:anywhere]">
              {metadata}
            </div>
          )}
          {description && (
            <p className="m-0! max-w-2xl whitespace-pre-wrap break-words text-sm! leading-relaxed! text-[#fffaf0]/80">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2 border-t border-white/10 pt-5">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}
