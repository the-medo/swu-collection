import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { useDeckData } from './../useDeckData';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import { selectDefaultVariant } from '@/lib/cards/selectDefaultVariant';
import { formatDataById } from '../../../../../../../types/Format.ts';

interface DeckImageProps {
  deckId: string;
}

const DeckImage = forwardRef<
  { handleDownload: () => void; handleCopyToClipboard: () => void },
  DeckImageProps
>(({ deckId }, ref) => {
  const { deckCardsForLayout, deckMeta, isLoading } = useDeckData(deckId);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [loadingImages, setLoadingImages] = useState(false);
  const [imagesToLoad, setImagesToLoad] = useState(0);
  const [loadedImages, setLoadedImages] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Constants for canvas dimensions and layout
  const canvasWidth = 2800;
  const canvasHeight = 8000;
  // const cardWidth = 300;
  // const cardHeight = 420;
  const cardWidth = 250;
  const cardHeight = 350;
  const leaderCardWidth = 420; // Wider for horizontal leader cards
  const leaderCardHeight = 300; // Adjusted for horizontal leader cards
  const padding = 15;
  const titleHeight = 180;
  const leftColumnWidth = leaderCardWidth + padding * 2;
  const maxCardsPerRow = 8; // Maximum cards in a row

  // Image cache to store loaded images
  const imageCache = useRef<Record<string, HTMLImageElement>>({});

  // Expose methods to parent component using useImperativeHandle
  useImperativeHandle(ref, () => ({
    handleDownload: () => {
      if (!canvasRef.current) return;

      const canvas = canvasRef.current;
      const link = document.createElement('a');
      link.download = `${deckMeta.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-deck.png`;
      link.href = canvas.toDataURL('image/png');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    },
    handleCopyToClipboard: async () => {
      if (!canvasRef.current) return;

      try {
        const canvas = canvasRef.current;
        canvas.toBlob(async blob => {
          if (blob) {
            const item = new ClipboardItem({ 'image/png': blob });
            await navigator.clipboard.write([item]);
            alert('Deck image copied to clipboard!');
          }
        });
      } catch (err) {
        console.error('Failed to copy to clipboard:', err);
        alert('Failed to copy image to clipboard. Your browser may not support this feature.');
      }
    },
  }));

  const loadImage = async (url: string): Promise<HTMLImageElement> => {
    if (imageCache.current[url]) {
      return imageCache.current[url];
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        if (!imageCache.current[url]) {
          imageCache.current[url] = img;
          setLoadedImages(prev => prev + 1);
        }
        resolve(img);
      };
      img.onerror = e => {
        console.error(`Failed to load image: ${url}`, e);
        reject(new Error(`Failed to load image: ${url}`));
      };
      img.src = url;
    });
  };

  useEffect(() => {
    if (isLoading) return;

    const preloadAllImages = async () => {
      try {
        setLoadingImages(true);
        setImagesLoaded(false);
        setLoadedImages(0);
        setError(null);

        const allImgs = new Set<string>();

        if (deckMeta.leader1) allImgs.add(deckMeta.leader1.cardId);
        if (deckMeta.leader2) allImgs.add(deckMeta.leader2.cardId);
        if (deckMeta.base) allImgs.add(deckMeta.base.cardId);

        deckCardsForLayout.cardsByBoard[1].forEach(c => allImgs.add(c.cardId));
        deckCardsForLayout.cardsByBoard[2].forEach(c => allImgs.add(c.cardId));

        let totalImageCount = allImgs.size;

        if (totalImageCount === 0) {
          setError('No cards to display');
          setLoadingImages(false);
          return;
        }

        setImagesToLoad(totalImageCount);

        // Load all images
        const promises: Promise<HTMLImageElement>[] = [];

        // Load leader images
        if (deckMeta.leader1) {
          const variantId = selectDefaultVariant(deckMeta.leader1);
          if (variantId && deckMeta.leader1.variants[variantId]) {
            const url = `https://images.swubase.com/cards/${deckMeta.leader1.variants[variantId].image.front}`;
            promises.push(loadImage(url));
          }
        }

        if (deckMeta.leader2) {
          const variantId = selectDefaultVariant(deckMeta.leader2);
          if (variantId && deckMeta.leader2.variants[variantId]) {
            const url = `https://images.swubase.com/cards/${deckMeta.leader2.variants[variantId].image.front}`;
            promises.push(loadImage(url));
          }
        }

        if (deckMeta.base) {
          const variantId = selectDefaultVariant(deckMeta.base);
          if (variantId && deckMeta.base.variants[variantId]) {
            const url = `https://images.swubase.com/cards/${deckMeta.base.variants[variantId].image.front}`;
            promises.push(loadImage(url));
          }
        }

        // Load main deck and sideboard card images
        for (const board of [1, 2]) {
          for (const card of deckCardsForLayout.cardsByBoard[board]) {
            const cardData = deckCardsForLayout.usedCards[card.cardId];
            if (cardData) {
              const variantId = selectDefaultVariant(cardData);
              if (variantId && cardData.variants[variantId]) {
                const url = `https://images.swubase.com/cards/${cardData.variants[variantId].image.front}`;
                promises.push(loadImage(url));
              }
            }
          }
        }

        await Promise.all(promises);
        setImagesLoaded(true);
      } catch (err) {
        setError(`Error loading images: ${(err as Error).message}`);
        console.error('Error loading images:', err);
      } finally {
        setLoadingImages(false);
      }
    };

    preloadAllImages();
  }, [isLoading, deckMeta, deckCardsForLayout]);

  // Draw the canvas once all images are loaded
  useEffect(() => {
    if (!imagesLoaded || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Function to draw a card with its image and optionally quantity
    const drawCard = async (
      cardId: string,
      x: number,
      y: number,
      width: number,
      height: number,
      quantity?: number,
    ) => {
      const card = deckCardsForLayout.usedCards[cardId];
      if (!card) return;

      const variantId = selectDefaultVariant(card);

      if (!variantId || !card.variants[variantId]) return;

      const imageUrl = `https://images.swubase.com/cards/${card.variants[variantId].image.front}`;
      try {
        const img = imageCache.current[imageUrl];
        if (!img) throw new Error(`Image not found in cache: ${imageUrl}`);

        // Draw card image
        ctx.drawImage(img, x, y, width, height);

        if (quantity) {
          // Position at bottom middle of card
          const badgeRadius = 30;
          const badgeX = x + width / 2;
          const badgeY = y + height - badgeRadius + 10;

          // Draw white border circle
          ctx.beginPath();
          ctx.arc(badgeX, badgeY, badgeRadius + 3, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();

          // Draw black inner circle
          ctx.beginPath();
          ctx.arc(badgeX, badgeY, badgeRadius, 0, Math.PI * 2);
          ctx.fillStyle = '#000000';
          ctx.fill();

          // Draw quantity text
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 45px Arial';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(`${quantity}`, badgeX, badgeY + 5);
        }
      } catch (err) {
        console.error(`Error drawing card ${cardId}:`, err);
      }
    };

    const renderDeckImage = async (final: boolean) => {
      let bottomPoint = 0;
      try {
        // Clear canvas with dark background
        ctx.fillStyle = '#1a1a1a';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        // Draw title
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 60px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(deckMeta.name, canvasWidth / 2, padding + 60);

        // Draw subtitle (author)
        ctx.font = '40px Arial';
        ctx.fillText(`by ${deckMeta.author}`, canvasWidth / 2, padding + 120);

        // Draw leaders section on the left
        let leftY = titleHeight + padding * 2;

        // Draw leader 1
        if (deckMeta.leader1) {
          const cardId = deckMeta.leader1.cardId;
          await drawCard(
            cardId,
            padding,
            leftY,
            leaderCardWidth, // Make sure to use the correct width for horizontal cards
            leaderCardHeight, // Make sure to use the correct height for horizontal cards
            undefined,
          );
          leftY += leaderCardHeight + padding;
        }

        // Draw leader 2 if present
        if (deckMeta.leader2) {
          await drawCard(
            deckMeta.leader2.cardId,
            padding,
            leftY,
            leaderCardWidth,
            leaderCardHeight,
            undefined,
          );
          leftY += leaderCardHeight + padding;
        }

        // Draw base card
        if (deckMeta.base) {
          await drawCard(
            deckMeta.base.cardId,
            padding,
            leftY,
            leaderCardWidth,
            leaderCardHeight,
            undefined,
          );
          leftY += leaderCardHeight + padding * 3;
        }

        // Draw format info under the base
        const formatInfo = formatDataById[deckMeta.format];
        ctx.fillStyle = '#ffffff';
        ctx.font = '30px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`Format: ${formatInfo.name}`, padding, leftY);

        bottomPoint = Math.max(bottomPoint, leftY);

        // Draw main deck section (right side)
        let rightX = leftColumnWidth + padding * 6;
        let rightY = titleHeight + padding * 2;

        // Process each card type group
        if (deckCardsForLayout.mainboardGroups) {
          for (const groupName of deckCardsForLayout.mainboardGroups.sortedIds) {
            const group = deckCardsForLayout.mainboardGroups.groups[groupName];
            if (!group || group.cards.length === 0) continue;

            // Draw group header
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 36px Arial';
            ctx.textAlign = 'left';
            ctx.fillText(
              `${group.label} (${group.cards.reduce((sum, card) => sum + card.quantity, 0)})`,
              rightX,
              rightY,
            );
            rightY += 50;

            // Draw cards in grid layout
            let cardCounter = 0;
            for (const card of group.cards) {
              const rowPosition = cardCounter % maxCardsPerRow;
              const x = rightX + rowPosition * (cardWidth + padding / 2);
              const y = rightY + Math.floor(cardCounter / maxCardsPerRow) * (cardHeight + padding);

              await drawCard(card.cardId, x, y, cardWidth, cardHeight, card.quantity);

              cardCounter++;
            }

            // Move to next group
            const rowsUsed = Math.ceil(group.cards.length / maxCardsPerRow);
            rightY += rowsUsed * (cardHeight + padding) + padding * 2;
            bottomPoint = Math.max(bottomPoint, rightY + rowsUsed * (cardHeight + padding));
          }
        }

        // Draw sideboard section
        const sideboardCards = deckCardsForLayout.cardsByBoard[2];
        if (sideboardCards.length > 0) {
          // Calculate sideboard height
          const rowsNeeded = Math.ceil(sideboardCards.length / maxCardsPerRow);
          const sideboardHeight = rowsNeeded * (cardHeight + padding) + padding * 7;

          // Draw sideboard background
          ctx.fillStyle = '#2a2a2a';
          ctx.fillRect(rightX - padding, rightY - padding, canvasWidth - rightX, sideboardHeight);

          // Draw sideboard header
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 36px Arial';
          ctx.textAlign = 'left';
          ctx.fillText(
            `Sideboard (${sideboardCards.reduce((sum, card) => sum + card.quantity, 0)})`,
            rightX,
            rightY + 36,
          );
          rightY += 86; // Header + padding

          // Draw sideboard cards
          let cardCounter = 0;
          for (const card of sideboardCards) {
            const rowPosition = cardCounter % maxCardsPerRow;
            const x = rightX + rowPosition * (cardWidth + padding);
            const y = rightY + Math.floor(cardCounter / maxCardsPerRow) * (cardHeight + padding);

            await drawCard(card.cardId, x, y, cardWidth, cardHeight, card.quantity);

            cardCounter++;
          }

          const sideboardBottom = rightY + sideboardHeight;
          bottomPoint = Math.max(bottomPoint, sideboardBottom);
        }

        const actualHeight = Math.min(Math.max(bottomPoint, 1200), 8000); // Set reasonable min/max
        if (final) {
          // Add water mark or signature at the bottom
          ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.font = '30px Arial';
          ctx.textAlign = 'right';
          ctx.fillText(
            'Created on SWUBase.com',
            canvasWidth - padding * 2,
            actualHeight - padding * 2,
          );
        } else {
          canvas.height = actualHeight;
          renderDeckImage(true);
        }
      } catch (err) {
        console.error('Error rendering deck image:', err);
        setError(`Error rendering deck image: ${(err as Error).message}`);
      }
    };

    renderDeckImage(false);
  }, [imagesLoaded, deckMeta, deckCardsForLayout]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <Skeleton className="w-full h-[600px] rounded-md" />
        <p className="mt-4 text-lg text-muted-foreground">Loading deck data...</p>
      </div>
    );
  }

  // Image loading progress state
  if (loadingImages) {
    return (
      <div className="flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm">
              Loading card images: {loadedImages} of {imagesToLoad}
            </span>
            <span className="text-sm font-medium">
              {Math.round((loadedImages / imagesToLoad) * 100)}%
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${Math.round((loadedImages / imagesToLoad) * 100)}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-destructive">
        <p className="text-lg font-semibold">Error generating deck image</p>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={canvasHeight}
        className="max-w-full h-auto border border-border rounded-md"
      />
    </div>
  );
});

DeckImage.displayName = 'DeckImage';

export default DeckImage;
