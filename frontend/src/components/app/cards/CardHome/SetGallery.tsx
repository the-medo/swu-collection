import { useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft } from 'lucide-react';
import { useCardList } from '@/api/lists/useCardList.ts';
import { Button } from '@/components/ui/button.tsx';
import { cn } from '@/lib/utils.ts';
import { setArraySorted, setInfo } from '../../../../../../lib/swu-resources/set-info.ts';
import { SwuSet } from '../../../../../../types/enums.ts';
import { indexCardPrintings } from '../../../../../../shared/lib/cardGroupPrintings.ts';
import {
  getSetPrintings,
  resolveSetGallerySelection,
  setGalleryShortcut,
  setGalleryLabels,
  setGalleryVariants,
  setGalleryVariantLabels,
  type SetGalleryCategory,
  type SetGalleryVariant,
} from './cardHomeLib.ts';
import VariantGallery from './VariantGallery.tsx';
import SetGalleryHeader from './SetGalleryHeader.tsx';
import CardGalleryDisplaySettings from './CardGalleryDisplaySettings.tsx';
import CardGalleryListSelect from './CardGalleryListSelect.tsx';
import { useCardGalleryList } from './useCardGalleryList.ts';

export default function SetGallery({
  setCode,
  category,
  variant,
}: {
  setCode: string;
  category: SetGalleryCategory;
  variant: SetGalleryVariant;
}) {
  const catalog = useCardList();
  const list = useCardGalleryList();
  const code = Object.values(SwuSet).find(set => set === setCode);
  const info = code ? setInfo[code] : undefined;
  const allPrintings = useMemo(
    () => [...indexCardPrintings(catalog.data?.cards ?? {}).values()],
    [catalog.data],
  );
  const sets = useMemo(
    () =>
      catalog.data
        ? setArraySorted.filter(
            set => set === code || allPrintings.some(p => p.variant.set === set),
          )
        : setArraySorted,
    [allPrintings, code, catalog.data],
  );
  const printingsByVariant = useMemo(
    () =>
      new Map(
        setGalleryVariants[category].map(treatment => [
          treatment,
          code ? getSetPrintings(allPrintings, code, category, treatment) : [],
        ]),
      ),
    [allPrintings, code, category],
  );
  const printings = printingsByVariant.get(variant) ?? [];
  const artwork = useMemo(() => {
    if (!code) return [];
    const leaders = getSetPrintings(allPrintings, code, 'leaders');
    return (leaders.length ? leaders : getSetPrintings(allPrintings, code, 'all')).slice(0, 3);
  }, [allPrintings, code]);
  const activeShortcut = category === 'leaders' && variant === 'showcase' ? 'showcases' : category;
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-3 sm:p-6">
      <Helmet
        title={`${info?.name ?? 'Set not found'} — ${setGalleryLabels[activeShortcut]} · ${setGalleryVariantLabels[variant]} | SWUBase`}
      />
      <Link
        to="/cards/search"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Card home
      </Link>
      {!info || !code ? (
        <h1 className="text-3xl font-bold">Set not found</h1>
      ) : (
        <>
          <SetGalleryHeader
            code={code}
            sets={sets}
            artwork={artwork}
            category={category}
            variant={variant}
          />
          <div className="space-y-5">
            <div className="flex flex-wrap items-end justify-between gap-4 border-b pb-4">
              <nav aria-label="Set card categories" className="flex flex-wrap gap-2">
                {setGalleryShortcut.options.map(shortcut => {
                  const selection = resolveSetGallerySelection(shortcut);
                  return (
                    <Link
                      key={shortcut}
                      to="/cards/sets/$setCode"
                      params={{ setCode }}
                      search={previous => ({
                        ...previous,
                        csCategory: selection.category,
                        csVariant: selection.variant,
                      })}
                      aria-current={activeShortcut === shortcut ? 'page' : undefined}
                      className={cn(
                        'rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-accent',
                        activeShortcut === shortcut
                          ? 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90'
                          : 'text-muted-foreground',
                      )}
                    >
                      {setGalleryLabels[shortcut]}
                    </Link>
                  );
                })}
              </nav>
              <CardGalleryListSelect list={list} />
            </div>
            {catalog.data && (
              <div className="flex flex-wrap items-start justify-between gap-3">
                <nav
                  aria-label="Card treatments"
                  className="flex min-h-9 flex-wrap items-center gap-2"
                >
                  <span className="mr-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Treatment
                  </span>
                  {setGalleryVariants[category]
                    .filter(
                      treatment =>
                        treatment === variant ||
                        (printingsByVariant.get(treatment)?.length ?? 0) > 0,
                    )
                    .map(treatment => (
                      <Link
                        key={treatment}
                        to="/cards/sets/$setCode"
                        params={{ setCode }}
                        search={previous => ({
                          ...previous,
                          csCategory: category,
                          csVariant: treatment,
                        })}
                        aria-current={variant === treatment ? 'page' : undefined}
                        className={cn(
                          'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors hover:bg-accent',
                          variant === treatment && 'border-primary/50 bg-primary/10 font-medium',
                        )}
                      >
                        {setGalleryVariantLabels[treatment]}
                        <span className="text-xs text-muted-foreground">
                          {printingsByVariant.get(treatment)?.length ?? 0}
                        </span>
                      </Link>
                    ))}
                </nav>
                <div className="ml-auto">
                  <CardGalleryDisplaySettings />
                </div>
              </div>
            )}
          </div>
          {catalog.isPending ? (
            <p role="status">Loading cards…</p>
          ) : catalog.isError ? (
            <div role="alert">
              Unable to load cards.{' '}
              <Button variant="link" onClick={() => void catalog.refetch()}>
                Retry
              </Button>
            </div>
          ) : (
            <VariantGallery
              key={`${setCode}:${category}:${variant}`}
              printings={printings}
              treatment={variant}
              listEditor={list.editor}
              emptyMessage={`No ${setGalleryVariantLabels[variant]} cards in ${info.name}. Choose another treatment or switch sets.`}
            />
          )}
        </>
      )}
    </div>
  );
}
