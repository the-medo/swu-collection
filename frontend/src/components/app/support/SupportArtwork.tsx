import { cn } from '@/lib/utils';

export function SupportArtwork({ className }: { className?: string }) {
  return (
    <figure className={cn('relative m-0 overflow-hidden', className)}>
      <img
        src="https://images.swubase.com/image-gallery/grogu-and-mando-2000.png"
        alt="Grogu and the Mandalorian playing cards"
        width={2000}
        height={1199}
        className="absolute inset-0 h-full w-full object-cover object-[55%_55%]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 left-0 hidden w-12 bg-linear-to-r from-card to-transparent @3xl:block"
      />
      <figcaption className="absolute right-3 bottom-3 rounded-md bg-black/70 px-2 py-1 text-[10px] leading-4 text-white">
        Illus. by Kateryna Telushko
      </figcaption>
    </figure>
  );
}
