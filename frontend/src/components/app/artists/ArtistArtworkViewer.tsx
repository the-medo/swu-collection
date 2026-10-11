import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowLeft, ArrowRight, RotateCcw } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog.tsx';
import { Button } from '@/components/ui/button.tsx';
import { getCardImageUrl } from '@/components/app/global/cardImageLib.ts';
import type { ArtistPrinting } from '../../../../../shared/lib/artists.ts';
import { getArtistArtworkKey, getArtistSetName } from './artistGallery.ts';

export default function ArtistArtworkViewer({
  printings,
  index,
  onSelect,
  onClose,
  onRestoreFocus,
}: {
  printings: ArtistPrinting[];
  index: number;
  onSelect: (printing: ArtistPrinting) => void;
  onClose: () => void;
  onRestoreFocus: () => void;
}) {
  const [backKey, setBackKey] = useState<string>();
  const printing = printings[index];
  const key = printing ? getArtistArtworkKey(printing) : undefined;
  const back = !!key && backKey === key;
  const move = (offset: number) => {
    const next = printings[index + offset];
    if (next) {
      setBackKey(undefined);
      onSelect(next);
    }
  };
  return (
    <Dialog
      open={!!printing}
      onOpenChange={open => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        className="max-h-[96dvh] w-[calc(100%-1rem)] max-w-4xl overflow-y-auto rounded-xl p-4 sm:p-6"
        onCloseAutoFocus={event => {
          event.preventDefault();
          onRestoreFocus();
        }}
        onKeyDown={event => {
          if (event.altKey || event.ctrlKey || event.metaKey) return;
          if (event.key === 'ArrowLeft') {
            event.preventDefault();
            move(-1);
          }
          if (event.key === 'ArrowRight') {
            event.preventDefault();
            move(1);
          }
        }}
      >
        {printing && (
          <>
            <div className="space-y-2 pr-8">
              <DialogTitle>{printing.card.name}</DialogTitle>
              <DialogDescription>
                {getArtistSetName(printing.variant.set)} #{printing.variant.cardNo} ·{' '}
                {printing.variant.variantName} · Art by {printing.variant.artist}
              </DialogDescription>
            </div>
            <img
              src={getCardImageUrl(
                back ? printing.variant.image.back : printing.variant.image.front,
              )}
              alt={`${printing.card.name}, ${back ? 'back' : 'front'} artwork by ${printing.variant.artist}`}
              className="mx-auto max-h-[65dvh] max-w-full rounded-lg object-contain"
            />
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button
                variant="outline"
                size="icon"
                aria-label="Previous artwork"
                disabled={index === 0}
                onClick={() => move(-1)}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <span role="status" className="text-sm tabular-nums">
                {index + 1} of {printings.length}
              </span>
              <Button
                variant="outline"
                size="icon"
                aria-label="Next artwork"
                disabled={index === printings.length - 1}
                onClick={() => move(1)}
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
              {!!printing.variant.image.back && (
                <Button variant="outline" onClick={() => setBackKey(back ? undefined : key)}>
                  <RotateCcw className="mr-2 h-4 w-4" />
                  {back ? 'Show front' : 'Show back'}
                </Button>
              )}
              <Button asChild>
                <Link
                  to="/cards/detail/$cardId"
                  params={{ cardId: printing.card.cardId }}
                  search={{ cardVariantId: printing.variant.variantId }}
                >
                  View card details
                </Link>
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
