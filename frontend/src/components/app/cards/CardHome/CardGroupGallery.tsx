import { useMemo } from 'react';
import { Link } from '@tanstack/react-router';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft } from 'lucide-react';
import { useCardList } from '@/api/lists/useCardList.ts';
import { useCardGroup } from '@/api/card-groups/useCardGroup.ts';
import { Button } from '@/components/ui/button.tsx';
import {
  indexCardPrintings,
  resolveCardGroupPrintings,
} from '../../../../../../shared/lib/cardGroupPrintings.ts';
import VariantGallery from './VariantGallery.tsx';
import CardGalleryDisplaySettings from './CardGalleryDisplaySettings.tsx';
import CardGalleryListSelect from './CardGalleryListSelect.tsx';
import { useCardGalleryList } from './useCardGalleryList.ts';

export default function CardGroupGallery({ groupId }: { groupId: string }) {
  const list = useCardGalleryList();
  const group = useCardGroup(groupId);
  const catalog = useCardList();
  const printings = useMemo(
    () =>
      resolveCardGroupPrintings(
        indexCardPrintings(catalog.data?.cards ?? {}),
        group.data?.variantIds ?? [],
      ),
    [catalog.data, group.data],
  );
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-2 sm:p-6">
      <Helmet title={`${group.data?.title ?? 'Card group'} | SWUBase`} />
      <Link
        to="/cards/search"
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Card home
      </Link>
      {group.isPending || catalog.isPending ? (
        <p role="status">Loading card group…</p>
      ) : group.isError || catalog.isError ? (
        <div role="alert" className="space-y-3 rounded-xl border p-6">
          <p>{group.error?.message ?? 'Unable to load card data.'}</p>
          <Button
            variant="outline"
            onClick={() => {
              void group.refetch();
              void catalog.refetch();
            }}
          >
            Try again
          </Button>
        </div>
      ) : (
        group.data && (
          <>
            <header className="max-w-3xl space-y-3">
              <h1 className="break-words text-3xl font-bold sm:text-4xl">{group.data.title}</h1>
              <p className="whitespace-pre-wrap break-words text-muted-foreground">
                {group.data.description}
              </p>
            </header>
            {printings.length < group.data.variantIds.length && (
              <p role="status" className="text-sm text-muted-foreground">
                Some versions in this group are no longer available in the catalog.
              </p>
            )}
            <div className="flex flex-wrap items-end justify-between gap-4">
              <CardGalleryListSelect list={list} />
              <CardGalleryDisplaySettings />
            </div>
            <VariantGallery key={groupId} printings={printings} listEditor={list.editor} />
          </>
        )
      )}
    </div>
  );
}
