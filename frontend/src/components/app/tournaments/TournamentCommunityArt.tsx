import { Camera, Image, PenLine, Sparkles, Users } from 'lucide-react';

export function TournamentPhotoArt() {
  return (
    <div aria-hidden="true" className="relative mx-auto h-28 w-52">
      <div className="absolute inset-x-4 top-5 h-20 rounded-full bg-primary/10 blur-2xl" />
      <div className="absolute left-3 top-4 w-24 -rotate-12 rounded-lg border border-primary/20 bg-card p-2 pb-5 shadow-sm">
        <div className="flex h-14 items-center justify-center rounded bg-primary/10 text-primary/60">
          <Users className="size-7" strokeWidth={1.3} />
        </div>
      </div>
      <div className="absolute right-3 top-3 w-24 rotate-12 rounded-lg border border-primary/20 bg-card p-2 pb-5 shadow-sm">
        <div className="flex h-14 items-center justify-center rounded bg-primary/10 text-primary/60">
          <Image className="size-7" strokeWidth={1.3} />
        </div>
      </div>
      <div className="absolute left-[4.5rem] top-12 flex size-16 items-center justify-center rounded-2xl border-4 border-card bg-primary text-primary-foreground shadow-sm">
        <Camera className="size-7" strokeWidth={1.5} />
      </div>
      <Sparkles className="absolute right-1 top-0 size-5 text-primary/60" strokeWidth={1.3} />
    </div>
  );
}

export function TournamentReportArt() {
  return (
    <div aria-hidden="true" className="relative mx-auto h-28 w-44">
      <div className="absolute inset-4 rounded-full bg-primary/10 blur-2xl" />
      <div className="absolute left-6 top-4 h-20 w-28 -rotate-6 rounded-lg border border-primary/20 bg-primary/5" />
      <div className="absolute left-9 top-2 h-24 w-28 rotate-6 space-y-2 rounded-lg border border-primary/20 bg-card p-4 shadow-sm">
        <div className="h-2 w-12 rounded bg-primary/40" />
        <div className="h-1 w-full rounded bg-primary/15" />
        <div className="h-1 w-full rounded bg-primary/15" />
        <div className="h-1 w-3/4 rounded bg-primary/15" />
        <div className="flex gap-1 pt-1">
          {[0, 1, 2].map(key => (
            <span key={key} className="h-3 w-5 rounded-sm border border-primary/20 bg-primary/5" />
          ))}
        </div>
      </div>
      <span className="absolute bottom-1 right-2 flex size-12 -rotate-6 items-center justify-center rounded-xl border-4 border-card bg-primary text-primary-foreground shadow-sm">
        <PenLine className="size-5" strokeWidth={1.5} />
      </span>
    </div>
  );
}
