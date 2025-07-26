import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';
import { useDeckData } from './../useDeckData';
import { Skeleton } from '@/components/ui/skeleton.tsx';
import { selectDefaultVariant } from '../../../../../../../server/lib/cards/selectDefaultVariant.ts';
import { formatDataById } from '../../../../../../../types/Format.ts';
import { SwuAspect } from '../../../../../../../types/enums.ts';
import { aspectColors } from '../../../../../../../shared/lib/aspectColors.ts';

interface DeckImageProps {
  deckId: string;
}

const DeckImage = forwardRef<
  { handleDownload: () => void; handleCopyToClipboard: () => void },
  DeckImageProps
>(({ deckId }, ref) => {
  const { deckCardsForLayout, deckMeta, isLoading, leaderCard } = useDeckData(deckId);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const [loadingImages, setLoadingImages] = useState(false);
  const [imagesToLoad, setImagesToLoad] = useState(0);
  const [loadedImages, setLoadedImages] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [backgroundImage, setBackgroundImage] = useState<HTMLImageElement | null>(null);

  const leaderColorAspect = leaderCard?.aspects.find(
    a => a !== SwuAspect.VILLAINY && a !== SwuAspect.HEROISM,
  );
  const leaderVillainyHeroismAspect = leaderCard?.aspects.find(
    a => a === SwuAspect.VILLAINY || a === SwuAspect.HEROISM,
  );

  // Helper function to remove text inside brackets
  const removeBracketContent = (text: string): string => {
    return text.replace(/\s*\[[^\]]*\]\s*/g, ' ').trim();
  };

  // Background image URL
  const backgroundImageUrl =
    'https://images.swubase.com/thumbnails/empty-deck-background-2800x2100.png';

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
      link.download = `${removeBracketContent(deckMeta.name)
        .replace(/[^a-z0-9]/gi, '_')
        .toLowerCase()}-deck.png`;
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
        setBackgroundImage(null);

        const allImgs = new Set<string>();

        if (deckMeta.leader1) allImgs.add(deckMeta.leader1.cardId);
        if (deckMeta.leader2) allImgs.add(deckMeta.leader2.cardId);
        if (deckMeta.base) allImgs.add(deckMeta.base.cardId);

        deckCardsForLayout.cardsByBoard[1].forEach(c => allImgs.add(c.cardId));
        deckCardsForLayout.cardsByBoard[2].forEach(c => allImgs.add(c.cardId));

        let totalImageCount = allImgs.size + 1; // +1 for background image

        if (totalImageCount === 1) {
          // Only background image, no cards
          setError('No cards to display');
          setLoadingImages(false);
          return;
        }

        setImagesToLoad(totalImageCount);

        // Load all images
        const promises: Promise<HTMLImageElement>[] = [];

        // Load background image
        try {
          const bgImg = await loadImage(backgroundImageUrl);
          setBackgroundImage(bgImg);
        } catch (err) {
          console.error('Failed to load background image:', err);
          // Continue even if background image fails to load
        }

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
        // Clear canvas
        ctx.clearRect(0, 0, canvasWidth, canvasHeight);

        // Draw background image or fallback to solid color
        if (backgroundImage) {
          // Repeat the background image vertically (on Y-axis)
          const imgWidth = canvasWidth; // Use full canvas width
          const imgHeight = backgroundImage.height * (canvasWidth / backgroundImage.width); // Maintain aspect ratio

          // Calculate how many times we need to repeat the image to cover the canvas height
          const repetitions = Math.ceil(canvasHeight / imgHeight);

          // Draw the background image repeatedly along the Y-axis
          for (let i = 0; i < repetitions; i++) {
            const y = i * imgHeight;

            if (i % 2 === 0) {
              // Draw normal orientation for even indices (0, 2, 4...)
              ctx.drawImage(backgroundImage, 0, y, imgWidth, imgHeight);
            } else {
              // Flip vertically for odd indices (1, 3, 5...)
              ctx.save();
              ctx.translate(0, y + imgHeight); // Move to the bottom of where the image should be
              ctx.scale(1, -1); // Flip vertically
              ctx.drawImage(backgroundImage, 0, 0, imgWidth, imgHeight);
              ctx.restore();
            }
          }
        } else {
          // Fallback to solid color if image failed to load
          ctx.fillStyle = '#1a1a1a';
          ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        }

        // Apply aspect color overlays
        // Apply color aspect overlay with 40% transparency if available
        if (leaderColorAspect && aspectColors[leaderColorAspect]) {
          const color = aspectColors[leaderColorAspect];
          // Convert hex to rgba with 40% transparency (alpha 0.6)
          const r = parseInt(color.slice(1, 3), 16);
          const g = parseInt(color.slice(3, 5), 16);
          const b = parseInt(color.slice(5, 7), 16);
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.35)`;
          ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        }

        // Apply villainy/heroism aspect overlay with 20% transparency if available
        if (leaderVillainyHeroismAspect && aspectColors[leaderVillainyHeroismAspect]) {
          const color = aspectColors[leaderVillainyHeroismAspect];
          // Convert hex to rgba with 20% transparency (alpha 0.2)
          const r = parseInt(color.slice(1, 3), 16);
          const g = parseInt(color.slice(3, 5), 16);
          const b = parseInt(color.slice(5, 7), 16);
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.1)`;
          ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        }

        // Draw title
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 60px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(removeBracketContent(deckMeta.name), canvasWidth / 2, padding + 90); // Moved 30px down

        // Draw subtitle (author)
        ctx.font = '40px Arial';
        ctx.fillText(`by ${deckMeta.author}`, canvasWidth / 2, padding + 150); // Moved 30px down

        // Draw leaders section on the left
        let leftY = titleHeight + padding * 2;

        // Draw leader 1
        if (deckMeta.leader1) {
          const cardId = deckMeta.leader1.cardId;
          await drawCard(
            cardId,
            padding + 30, // Moved 30px to the right
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
            padding + 30, // Moved 30px to the right
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
            padding + 30, // Moved 30px to the right
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
        ctx.fillText(`Format: ${formatInfo.name}`, padding + 30, leftY); // Moved 30px to the right

        bottomPoint = Math.max(bottomPoint, leftY);

        // Draw main deck section (right side)
        let rightX = leftColumnWidth + padding * 6;
        let rightY = titleHeight + padding * 2;

        // Process each card type group
        if (deckCardsForLayout.mainboardGroups) {
          // First, collect all valid groups
          const groups = [];
          for (const groupName of deckCardsForLayout.mainboardGroups.sortedIds) {
            const group = deckCardsForLayout.mainboardGroups.groups[groupName];
            if (!group || group.cards.length === 0) continue;
            groups.push(group);
          }

          let currentGroupIndex = 0;

          while (currentGroupIndex < groups.length) {
            // Start processing a new set of groups that might fit in one or more rows
            const startY = rightY;
            let remainingSlotsInRow = maxCardsPerRow;
            let groupsToProcess = [];
            let totalCardsToProcess = 0;

            // Try to fit as many small groups as possible in the current row(s)
            while (currentGroupIndex < groups.length) {
              const currentGroup = groups[currentGroupIndex];
              const currentGroupSize = currentGroup.cards.length;

              // If this is the first group we're considering or it fits in the remaining slots
              if (groupsToProcess.length === 0 || currentGroupSize <= remainingSlotsInRow) {
                groupsToProcess.push(currentGroup);
                totalCardsToProcess += currentGroupSize;
                remainingSlotsInRow -= currentGroupSize;
                currentGroupIndex++;

                // If we've filled the row completely, break
                if (remainingSlotsInRow === 0) {
                  break;
                }
              } else {
                // This group doesn't fit in the current row
                break;
              }
            }

            // Calculate how many rows we'll need for these groups
            const rowsNeeded = Math.ceil(totalCardsToProcess / maxCardsPerRow);

            // Draw headers for all groups
            rightY = startY + 20;
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 36px Arial';
            ctx.textAlign = 'left';

            // First, draw all headers with appropriate spacing
            let headerX = rightX;
            let cardPositionInRow = 0;

            for (const group of groupsToProcess) {
              // Draw group header
              ctx.fillText(
                `${group.label} (${group.cards.reduce((sum, card) => sum + card.quantity, 0)})`,
                headerX,
                rightY,
              );

              // Calculate where the next header should go
              const groupCardCount = group.cards.length;
              const cardsInThisRow = Math.min(groupCardCount, maxCardsPerRow - cardPositionInRow);
              const headerWidth = cardsInThisRow * (cardWidth + padding / 2);

              // Add some spacing between headers in the same row
              headerX += headerWidth;
              cardPositionInRow += cardsInThisRow;

              // If we've reached the end of a row, reset for the next row
              if (cardPositionInRow >= maxCardsPerRow) {
                headerX = rightX;
                cardPositionInRow = 0;
              }
            }

            // Move down past the headers
            rightY += 30;

            // Draw all cards for the groups
            let cardCounter = 0;

            for (const group of groupsToProcess) {
              // Add a small visual separator between groups in the same row
              if (cardCounter > 0 && cardCounter % maxCardsPerRow !== 0) {
                cardCounter += 0; // No actual gap, just keeping the code structure for potential future adjustments
              }

              for (const card of group.cards) {
                const rowPosition = cardCounter % maxCardsPerRow;
                const rowNumber = Math.floor(cardCounter / maxCardsPerRow);
                const x = rightX + rowPosition * (cardWidth + padding / 2);
                const y = rightY + rowNumber * (cardHeight + padding);

                await drawCard(card.cardId, x, y, cardWidth, cardHeight, card.quantity);

                cardCounter++;
              }
            }

            // Move to next set of groups
            rightY += rowsNeeded * (cardHeight + padding) + padding;
            bottomPoint = Math.max(bottomPoint, rightY);
          }
        }

        // move sideboard box down
        rightY += 50;

        // Draw sideboard section
        const sideboardCards = deckCardsForLayout.cardsByBoard[2];
        if (sideboardCards.length > 0) {
          // Calculate sideboard height
          const rowsNeeded = Math.ceil(sideboardCards.length / maxCardsPerRow);
          const sideboardHeight = rowsNeeded * (cardHeight + padding) + padding * 7;

          // Draw sideboard background with slight transparency
          ctx.fillStyle = 'rgba(42, 42, 42, 0.5)'; // 70% opacity
          ctx.fillRect(
            rightX - padding - 15,
            rightY - padding,
            canvasWidth - rightX,
            sideboardHeight,
          ); // Moved 15px to the left

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
