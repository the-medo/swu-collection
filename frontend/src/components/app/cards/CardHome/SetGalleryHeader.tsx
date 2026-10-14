import { useNavigate } from '@tanstack/react-router';
import { ChevronLeft, ChevronRight, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button.tsx';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select.tsx';
import CardArtCrop from '@/components/app/global/CardArtCrop.tsx';
import { setInfo } from '../../../../../../lib/swu-resources/set-info.ts';
import type { SwuSet } from '../../../../../../types/enums.ts';
import type { CardPrinting } from '../../../../../../shared/lib/cardGroupPrintings.ts';
import type { SetGalleryCategory, SetGalleryVariant } from './cardHomeLib.ts';
import SetLogo from './SetLogo.tsx';

export default function SetGalleryHeader({
  code,
  sets,
  artwork,
  category,
  variant,
}: {
  code: SwuSet;
  sets: SwuSet[];
  artwork: CardPrinting[];
  category: SetGalleryCategory;
  variant: SetGalleryVariant;
}) {
  const navigate = useNavigate({ from: '/cards/sets/$setCode' });
  const info = setInfo[code];
  const position = sets.indexOf(code);
  const newer = position > 0 ? sets[position - 1] : undefined;
  const older = position >= 0 ? sets[position + 1] : undefined;
  const changeSet = (setCode: string) =>
    void navigate({
      to: '/cards/sets/$setCode',
      params: { setCode },
      search: previous => ({ ...previous, csCategory: category, csVariant: variant }),
    });
  return (
    <header className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="relative isolate overflow-hidden bg-slate-950 px-5 py-8 text-white sm:px-8 sm:py-10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background: `radial-gradient(ellipse at 10% 100%, ${info.hexColor}aa, transparent 70%)`,
          }}
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 grid w-3/4 grid-cols-3 gap-2 opacity-40 sm:w-3/5 sm:opacity-60"
          style={{ maskImage: 'linear-gradient(to right, transparent, black)' }}
        >
          {artwork.map(({ card, variant: printing }) => (
            <div key={printing.variantId} className="-rotate-12 scale-125 overflow-hidden">
              <CardArtCrop
                card={card}
                cardVariantId={printing.variantId}
                alt=""
                fit="cover"
                className="h-full"
              />
            </div>
          ))}
        </div>
        <div className="relative flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:gap-7">
          <SetLogo
            key={code}
            set={code}
            className="h-20 w-36 shrink-0 rounded-xl border border-white/15 bg-slate-950/75 p-3 sm:h-28 sm:w-48"
          />
          <div className="max-w-xl space-y-3">
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
              <Layers className="size-3.5" /> Card library <span aria-hidden="true">/</span>{' '}
              {code.toUpperCase()}
            </p>
            <h1 className="text-3xl font-bold tracking-tight drop-shadow-md sm:text-4xl lg:text-5xl">
              {info.name}
            </h1>
            <p className="text-sm text-white/75">
              Every card. Every treatment. Find your favorites.
            </p>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3 border-t px-4 py-4 sm:px-6">
        <span className="mr-auto text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Explore the sets
        </span>
        <div className="flex w-full items-center gap-2 sm:w-auto">
          <Button
            variant="outline"
            size="icon"
            className="h-11 w-11 shrink-0"
            aria-label="Newer set"
            title={newer ? setInfo[newer].name : 'Newest set'}
            disabled={!newer}
            onClick={() => {
              if (newer) changeSet(newer);
            }}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Select value={code} onValueChange={changeSet}>
            <SelectTrigger aria-label="Choose a set" className="h-11 min-w-0 flex-1 sm:w-72">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {sets.map(set => (
                <SelectItem key={set} value={set}>
                  <span className="flex items-center gap-2">
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: setInfo[set].hexColor }}
                    />
                    <span className="w-10 shrink-0 text-xs font-semibold text-muted-foreground">
                      {set.toUpperCase()}
                    </span>
                    <span>{setInfo[set].name}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            className="h-11 w-11 shrink-0"
            aria-label="Older set"
            title={older ? setInfo[older].name : 'Oldest set'}
            disabled={!older}
            onClick={() => {
              if (older) changeSet(older);
            }}
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
