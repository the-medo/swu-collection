import * as React from 'react';
import { DeckCardsForLayout } from '@/components/app/decks/DeckContents/DeckCards/deckCardsLib.ts';
import { useGetDeck } from '@/api/decks/useGetDeck.ts';
import CardImage from '@/components/app/global/CardImage.tsx';
import { toast } from '@/hooks/use-toast.ts';
import { cn } from '@/lib/utils.ts';
import { Button } from '@/components/ui/button.tsx';
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table.tsx';
import { Copy } from 'lucide-react';
import { DeckCard } from '../../../../../../../../../types/ZDeckCard.ts';
import { selectDefaultVariant } from '../../../../../../../../../server/lib/cards/selectDefaultVariant.ts';

interface DeckLayoutWithWordingProps {
  deckId: string;
  deckCardsForLayout: DeckCardsForLayout;
  highlightedCardId?: string;
  compact?: boolean;
}

interface DeckLayoutWithWordingSectionProps {
  title: string;
  cards: DeckCard[];
  usedCards: DeckCardsForLayout['usedCards'];
  highlightedCardId?: string;
  compact?: boolean;
}

interface DeckLayoutWithWordingRowProps {
  card: DeckCardsForLayout['usedCards'][string] | null | undefined;
  prefix?: string;
  label?: string;
  wording?: string | null;
  backSide?: boolean;
  isHighlighted?: boolean;
  compact?: boolean;
}

const getTraitsLabel = (traits?: string[]) => {
  if (!traits || traits.length === 0) return null;
  return traits.join(', ');
};

const getCardWording = (card: DeckCardsForLayout['usedCards'][string]) => {
  if (!card) return null;

  const wordingSections = [
    card.text?.trim(),
    card.deployBox?.trim() ? `Deploy: ${card.deployBox.trim()}` : null,
    card.epicAction?.trim() ? `Epic Action: ${card.epicAction.trim()}` : null,
  ].filter(Boolean);

  return wordingSections.length > 0 ? wordingSections.join('\n\n') : null;
};

const getLeaderFrontWording = (card: DeckCardsForLayout['usedCards'][string]) => {
  if (!card) return null;

  const wordingSections = [
    card.text?.trim(),
    card.epicAction?.trim() ? `Epic Action: ${card.epicAction.trim()}` : null,
  ].filter(Boolean);

  return wordingSections.length > 0 ? wordingSections.join('\n\n') : null;
};

const getLeaderBackWording = (card: DeckCardsForLayout['usedCards'][string]) => {
  if (!card) return null;

  const wordingSections = [card.deployBox?.trim()].filter(Boolean);

  return wordingSections.length > 0 ? wordingSections.join('\n\n') : null;
};

const DeckLayoutWithWordingRow: React.FC<DeckLayoutWithWordingRowProps> = ({
  card,
  prefix,
  label,
  wording,
  backSide = false,
  isHighlighted = false,
  compact = false,
}) => {
  const traitsLabel = getTraitsLabel(card?.traits);
  const defaultVariant = card ? selectDefaultVariant(card) : undefined;
  const imageSize = compact ? 'w50' : 'w75';

  return (
    <TableRow data-state={isHighlighted ? 'highlighted' : undefined} className="hover:bg-muted/25">
      <TableCell
        className={cn('align-top p-2', {
          'w-[72px]': compact,
          'w-[98px]': !compact,
        })}
      >
        <div className="flex justify-center">
          <CardImage
            card={card ?? undefined}
            cardVariantId={defaultVariant}
            size={imageSize}
            backSide={backSide}
            backSideButton={false}
            forceHorizontal={(backSide ? card?.back?.horizontal : card?.front.horizontal) ?? false}
          />
        </div>
      </TableCell>
      <TableCell className="align-top py-2 pr-3">
        {label && (
          <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </div>
        )}
        <div className="flex flex-wrap items-baseline gap-x-1 gap-y-0.5 break-words">
          {prefix && <span className="text-sm font-medium text-muted-foreground">{prefix}</span>}
          <span className="font-semibold">{card?.name ?? 'Unknown card'}</span>
          {traitsLabel && <span className="text-sm text-muted-foreground">({traitsLabel})</span>}
        </div>
        {wording ? (
          <div className="mt-1 whitespace-pre-line text-sm leading-5 break-words">{wording}</div>
        ) : (
          <div className="mt-1 text-sm italic text-muted-foreground">No card text.</div>
        )}
      </TableCell>
    </TableRow>
  );
};

const DeckLayoutWithWordingSection: React.FC<DeckLayoutWithWordingSectionProps> = ({
  title,
  cards,
  usedCards,
  highlightedCardId,
  compact = false,
}) => {
  if (cards.length === 0) return null;

  return (
    <section className="flex flex-col gap-2">
      <div className="text-sm font-semibold">
        {title} ({cards.reduce((sum, card) => sum + card.quantity, 0)})
      </div>
      <div className="rounded-md border overflow-hidden">
        <Table className="table-fixed">
          <TableBody>
            {cards.map(deckCard => {
              const card = usedCards[deckCard.cardId];

              return (
                <DeckLayoutWithWordingRow
                  key={`${deckCard.board}-${deckCard.cardId}`}
                  card={card}
                  prefix={`${deckCard.quantity}x`}
                  wording={getCardWording(card)}
                  isHighlighted={highlightedCardId === deckCard.cardId}
                  compact={compact}
                />
              );
            })}
          </TableBody>
        </Table>
      </div>
    </section>
  );
};

const DeckLayoutWithWording: React.FC<DeckLayoutWithWordingProps> = ({
  deckId,
  deckCardsForLayout: { mainboardGroups, cardsByBoard, usedCards },
  highlightedCardId,
  compact = false,
}) => {
  const { data: deckInfo } = useGetDeck(deckId);
  const contentRef = React.useRef<HTMLDivElement>(null);
  const imageDataUrlCacheRef = React.useRef<Map<string, Promise<string>>>(new Map());
  const contentId = `deck-layout-with-wording-${deckId}`;

  const leader1 = deckInfo?.deck.leaderCardId1 ? usedCards[deckInfo.deck.leaderCardId1] : null;
  const leader2 = deckInfo?.deck.leaderCardId2 ? usedCards[deckInfo.deck.leaderCardId2] : null;
  const base = deckInfo?.deck.baseCardId ? usedCards[deckInfo.deck.baseCardId] : null;

  const loadImage = React.useCallback((src: string) => {
    return new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.decoding = 'sync';
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`Failed to load image: ${src}`));
      image.src = src;
    });
  }, []);

  const convertImageSrcToPngDataUrl = React.useCallback(
    async (src: string) => {
      const cached = imageDataUrlCacheRef.current.get(src);
      if (cached) return cached;

      const conversionPromise = (async () => {
        let imageSource = src;
        let objectUrl: string | undefined;

        try {
          if (!src.startsWith('data:')) {
            const response = await fetch(src, { mode: 'cors', credentials: 'omit' });
            if (!response.ok) {
              throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
            }

            const blob = await response.blob();
            objectUrl = URL.createObjectURL(blob);
            imageSource = objectUrl;
          }

          const image = await loadImage(imageSource);
          const canvas = document.createElement('canvas');
          canvas.width = image.naturalWidth || image.width;
          canvas.height = image.naturalHeight || image.height;

          const context = canvas.getContext('2d');
          if (!context) {
            throw new Error('Canvas 2D context is unavailable');
          }

          context.drawImage(image, 0, 0);
          return canvas.toDataURL('image/png');
        } finally {
          if (objectUrl) URL.revokeObjectURL(objectUrl);
        }
      })().catch(error => {
        imageDataUrlCacheRef.current.delete(src);
        throw error;
      });

      imageDataUrlCacheRef.current.set(src, conversionPromise);
      return conversionPromise;
    },
    [loadImage],
  );

  const copyRichHtml = React.useCallback(async (element: HTMLElement) => {
    const cloneWrapper = document.createElement('div');
    cloneWrapper.contentEditable = 'true';
    cloneWrapper.style.position = 'fixed';
    cloneWrapper.style.left = '-99999px';
    cloneWrapper.style.top = '0';
    cloneWrapper.style.pointerEvents = 'none';
    cloneWrapper.style.userSelect = 'text';

    const clone = element.cloneNode(true) as HTMLElement;
    clone.removeAttribute('id');
    cloneWrapper.appendChild(clone);
    document.body.appendChild(cloneWrapper);

    const originalImages = Array.from(element.querySelectorAll('img'));
    const clonedImages = Array.from(clone.querySelectorAll('img'));

    await Promise.all(
      clonedImages.map(async (cloneImg, index) => {
        const originalImg = originalImages[index];
        const source = originalImg?.currentSrc || originalImg?.src || cloneImg.currentSrc || cloneImg.src;
        if (!source) return;

        try {
          cloneImg.src = await convertImageSrcToPngDataUrl(source);
          cloneImg.removeAttribute('srcset');
          cloneImg.removeAttribute('sizes');
        } catch (error) {
          console.warn('Failed to convert image for rich copy:', error);
        }

        const computedStyle = originalImg ? window.getComputedStyle(originalImg) : null;
        const width = originalImg?.clientWidth || originalImg?.naturalWidth;
        const height = originalImg?.clientHeight || originalImg?.naturalHeight;

        if (width) cloneImg.style.width = `${width}px`;
        if (height) cloneImg.style.height = `${height}px`;
        if (computedStyle) {
          cloneImg.style.objectFit = computedStyle.objectFit;
          cloneImg.style.display = computedStyle.display;
          cloneImg.style.borderRadius = computedStyle.borderRadius;
        }

        if (!cloneImg.complete) {
          await new Promise<void>(resolve => {
            cloneImg.onload = () => resolve();
            cloneImg.onerror = () => resolve();
          });
        }
      }),
    );

    const preparedHtml = clone.outerHTML;
    const preparedText = clone.innerText;

    const selection = window.getSelection();
    const previousRanges: Range[] = [];
    if (selection) {
      for (let i = 0; i < selection.rangeCount; i++) {
        previousRanges.push(selection.getRangeAt(i).cloneRange());
      }
    }

    try {
      cloneWrapper.focus();
      if (selection) {
        selection.removeAllRanges();
        const range = document.createRange();
        range.selectNodeContents(cloneWrapper);
        selection.addRange(range);
      }

      return {
        copied: document.execCommand('copy'),
        html: preparedHtml,
        text: preparedText,
      };
    } finally {
      if (selection) {
        selection.removeAllRanges();
        previousRanges.forEach(range => selection.addRange(range));
      }
      document.body.removeChild(cloneWrapper);
    }
  }, [convertImageSrcToPngDataUrl]);

  const handleCopyToClipboard = React.useCallback(async () => {
    const element = contentRef.current ?? document.getElementById(contentId);

    if (!element) {
      toast({
        title: 'Failed to copy wording table',
        description: 'The wording table could not be found.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const richCopyResult = await copyRichHtml(element);

      if (richCopyResult.copied) {
        toast({
          title: 'Wording table copied',
          description: 'Rich HTML with embedded images was copied using the browser copy pipeline.',
        });
        return;
      }

      if (navigator.clipboard?.write && typeof ClipboardItem !== 'undefined') {
        const clipboardItem = new ClipboardItem({
          'text/html': new Blob([richCopyResult.html], { type: 'text/html' }),
          'text/plain': new Blob([richCopyResult.text], { type: 'text/plain' }),
        });

        await navigator.clipboard.write([clipboardItem]);

        toast({
          title: 'Wording table copied',
          description: 'Embedded-image HTML was copied to your clipboard.',
        });
        return;
      }

      await navigator.clipboard.writeText(richCopyResult.html);

      toast({
        title: 'Wording table copied',
        description: 'Only the HTML markup could be copied as plain text in this browser.',
      });
    } catch (error) {
      console.error('Failed to copy wording table to clipboard:', error);
      toast({
        title: 'Failed to copy wording table',
        description: 'Your browser did not allow clipboard access.',
        variant: 'destructive',
      });
    }
  }, [contentId, copyRichHtml]);

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => void handleCopyToClipboard()}>
          <Copy />
          Copy table to clipboard
        </Button>
      </div>

      <div id={contentId} ref={contentRef} className="flex w-full flex-col gap-6">
        {(leader1 || leader2 || base) && (
          <section className="flex flex-col gap-2">
            <div className="text-sm font-semibold">Leader / Base</div>
            <div className="rounded-md border overflow-hidden">
              <Table className="table-fixed">
                <TableBody>
                  {leader1 && (
                    <DeckLayoutWithWordingRow
                      card={leader1}
                      label={leader2 ? 'Leader 1 - Front' : 'Leader - Front'}
                      wording={getLeaderFrontWording(leader1)}
                      compact={compact}
                    />
                  )}
                  {leader1?.back && (
                    <DeckLayoutWithWordingRow
                      card={leader1}
                      label={leader2 ? 'Leader 1 - Back' : 'Leader - Back'}
                      wording={getLeaderBackWording(leader1)}
                      backSide={true}
                      compact={compact}
                    />
                  )}
                  {leader2 && (
                    <DeckLayoutWithWordingRow
                      card={leader2}
                      label="Leader 2 - Front"
                      wording={getLeaderFrontWording(leader2)}
                      compact={compact}
                    />
                  )}
                  {leader2?.back && (
                    <DeckLayoutWithWordingRow
                      card={leader2}
                      label="Leader 2 - Back"
                      wording={getLeaderBackWording(leader2)}
                      backSide={true}
                      compact={compact}
                    />
                  )}
                  {base && (
                    <DeckLayoutWithWordingRow
                      card={base}
                      label="Base"
                      wording={getCardWording(base)}
                      compact={compact}
                    />
                  )}
                </TableBody>
              </Table>
            </div>
          </section>
        )}

        {mainboardGroups?.sortedIds.map(groupName => {
          const group = mainboardGroups.groups[groupName];
          if (!group || group.cards.length === 0) return null;

          return (
            <DeckLayoutWithWordingSection
              key={groupName}
              title={group.label}
              cards={group.cards}
              usedCards={usedCards}
              highlightedCardId={highlightedCardId}
              compact={compact}
            />
          );
        })}

        {cardsByBoard[2].length > 0 && (
          <DeckLayoutWithWordingSection
            title="Sideboard"
            cards={cardsByBoard[2]}
            usedCards={usedCards}
            highlightedCardId={highlightedCardId}
            compact={compact}
          />
        )}

        {cardsByBoard[3].length > 0 && (
          <DeckLayoutWithWordingSection
            title="Maybeboard"
            cards={cardsByBoard[3]}
            usedCards={usedCards}
            highlightedCardId={highlightedCardId}
            compact={compact}
          />
        )}
      </div>
    </div>
  );
};

export default DeckLayoutWithWording;
