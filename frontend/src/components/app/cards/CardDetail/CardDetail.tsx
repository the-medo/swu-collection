import * as React from 'react';
import { useCardList } from '@/api/lists/useCardList.ts';
import { useMemo, useState } from 'react';
import CardImage from '@/components/app/global/CardImage.tsx';
import { selectDefaultVariant } from '@/lib/cards/selectDefaultVariant.ts';
import { Badge } from '@/components/ui/badge.tsx';
import { Card, CardContent } from '@/components/ui/card.tsx';
import { Separator } from '@/components/ui/separator.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.tsx';
import { Link } from '@tanstack/react-router';

interface CardDetailProps {
  cardId: string;
}

const CardDetail: React.FC<CardDetailProps> = ({ cardId }) => {
  const { data: cardList, isFetching: isFetchingCardList } = useCardList();

  const card = useMemo(() => {
    if (!cardList) return undefined;
    return cardList.cards[cardId];
  }, [cardList, cardId]);

  // Default variant as initial state
  const defaultVariantId = useMemo(() => {
    return card ? selectDefaultVariant(card) : undefined;
  }, [card]);

  // State to track the selected variant
  const [selectedVariantId, setSelectedVariantId] = useState<string | undefined>(undefined);

  // Get the current variant object based on selected id
  const selectedVariant = useMemo(() => {
    if (!card) return undefined;
    if (!selectedVariantId && defaultVariantId) return card.variants[defaultVariantId];
    return card.variants[selectedVariantId];
  }, [card, defaultVariantId, selectedVariantId]);

  // Get all variants for the card
  const allVariants = useMemo(() => {
    if (!card) return [];
    return Object.entries(card.variants).map(([variantId, variantData]) => ({
      id: variantId,
      ...variantData,
    }));
  }, [card]);

  if (!card) {
    return (
      <div className="flex flex-col gap-4">
        <h2>Card not found: {cardId}</h2>
        {isFetchingCardList && <p>Loading card data...</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-2">
      <Link to={`/cards/detail/$cardId`} params={{ cardId }}>
        <h2 className="text-xl font-bold">{card.name}</h2>
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-[350px_1fr_300px] gap-4">
        {/* Left Column - Card Image and Variant Info */}
        <div className="flex flex-col gap-3">
          <div className="flex justify-center">
            <CardImage
              size="w300"
              card={card}
              cardVariantId={selectedVariantId ?? defaultVariantId}
            />
          </div>

          {/* Card Variant Information */}
          {selectedVariant && (
            <Card className="overflow-hidden">
              <CardContent className="pt-4 px-4 pb-3">
                <div className="space-y-1">
                  <h3 className="text-base font-semibold">Variant Information</h3>
                  <Separator className="my-1" />
                  <PropertyRow
                    label="Set"
                    value={`${selectedVariant.fullSetName} (${selectedVariant.set})`}
                  />
                  <PropertyRow label="Card Number" value={selectedVariant.cardNo.toString()} />
                  <PropertyRow label="Variant" value={selectedVariant.variantName} />
                  <PropertyRow label="Artist" value={selectedVariant.artist || 'Unknown'} />
                  <PropertyRow
                    label="Availability"
                    value={
                      <span>
                        {selectedVariant.hasNonfoil && selectedVariant.hasFoil
                          ? 'Non-foil & Foil'
                          : selectedVariant.hasNonfoil
                            ? 'Non-foil Only'
                            : 'Foil Only'}
                      </span>
                    }
                  />
                </div>
                <Separator className="my-1" />
                <div
                  className="text-xs text-muted-foreground text-center cursor-pointer hover:text-foreground transition-colors"
                  onClick={() => navigator.clipboard.writeText(card.cardId)}
                  title="Click to copy card ID"
                >
                  ID: {card.cardId}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Middle Column - Card Details with Tabs */}
        <Card className="overflow-hidden">
          <CardContent className="pt-4 px-4">
            <Tabs defaultValue="details" className="w-full">
              <TabsList className="mb-2 w-full grid grid-cols-2">
                <TabsTrigger value="details">Card Details</TabsTrigger>
                <TabsTrigger value="variants">Variants ({allVariants.length})</TabsTrigger>
              </TabsList>

              {/* Card Details Tab */}
              <TabsContent value="details" className="space-y-3 mt-0">
                {/* Basic Info */}
                <div className="space-y-1">
                  <h3 className="text-base font-semibold">Basic Information</h3>
                  <Separator className="my-1" />

                  <PropertyRow label="Type" value={card.type} />
                  <PropertyRow label="Rarity" value={card.rarity} />
                  {card.cost !== null && <PropertyRow label="Cost" value={card.cost.toString()} />}
                  {(card.power !== null || card.hp !== null) && (
                    <PropertyRow
                      label="Power / HP"
                      value={`${card.power !== null ? card.power : '-'}/${card.hp !== null ? card.hp : '-'}`}
                    />
                  )}
                  {(card.upgradePower || card.upgradeHp) && (
                    <PropertyRow
                      label="Upgrade Power / HP"
                      value={`${card.upgradePower || '-'}/${card.upgradeHp || '-'}`}
                    />
                  )}
                </div>

                {/* Card Text */}
                {card.text && (
                  <div className="space-y-1">
                    <h3 className="text-base font-semibold">Card Text</h3>
                    <Separator className="my-1" />
                    <div className="bg-muted p-2 rounded-md whitespace-pre-line text-sm">
                      {card.text}
                    </div>
                  </div>
                )}

                {/* Rules */}
                {card.rules && (
                  <div className="space-y-1">
                    <h3 className="text-base font-semibold">Rules</h3>
                    <Separator className="my-1" />
                    <div className="bg-muted p-2 rounded-md whitespace-pre-line text-sm">
                      {card.rules}
                    </div>
                  </div>
                )}

                {/* Epic Action */}
                {card.epicAction && (
                  <div className="space-y-1">
                    <h3 className="text-base font-semibold">Epic Action</h3>
                    <Separator className="my-1" />
                    <div className="bg-muted p-2 rounded-md whitespace-pre-line text-sm">
                      {card.epicAction}
                    </div>
                  </div>
                )}

                {/* Deploy Box */}
                {card.deployBox && (
                  <div className="space-y-1">
                    <h3 className="text-base font-semibold">Deploy Box</h3>
                    <Separator className="my-1" />
                    <div className="bg-muted p-2 rounded-md whitespace-pre-line text-sm">
                      {card.deployBox}
                    </div>
                  </div>
                )}

                {/* Arenas */}
                {card.arenas && card.arenas.length > 0 && (
                  <PropertyRow
                    label="Arenas"
                    value={
                      <div className="flex flex-wrap gap-2">
                        {card.arenas.map(arena => (
                          <Badge key={arena} variant="outline">
                            {arena}
                          </Badge>
                        ))}
                      </div>
                    }
                  />
                )}

                {/* Aspects */}
                {card.aspects && card.aspects.length > 0 && (
                  <PropertyRow
                    label="Aspects"
                    value={
                      <div className="flex flex-wrap gap-2">
                        {card.aspects.map(aspect => (
                          <Badge key={aspect} variant="secondary">
                            {aspect}
                          </Badge>
                        ))}
                      </div>
                    }
                  />
                )}

                {/* Keywords */}
                {card.keywords && card.keywords.length > 0 && (
                  <PropertyRow
                    label="Keywords"
                    value={
                      <div className="flex flex-wrap gap-2">
                        {card.keywords.map(keyword => (
                          <Badge key={keyword} variant="default">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    }
                  />
                )}

                {/* Traits */}
                {card.traits && card.traits.length > 0 && (
                  <PropertyRow
                    label="Traits"
                    value={
                      <div className="flex flex-wrap gap-2">
                        {card.traits.map(trait => (
                          <Badge key={trait} variant="outline">
                            {trait}
                          </Badge>
                        ))}
                      </div>
                    }
                  />
                )}
              </TabsContent>

              {/* Variants Tab */}
              <TabsContent value="variants" className="mt-0">
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-3">
                    {allVariants.map(variant => (
                      <div
                        key={variant.id}
                        className={`cursor-pointer transition-all duration-200 rounded-md p-2 border-2 ${
                          selectedVariantId === variant.id
                            ? 'border-primary bg-primary/5'
                            : 'border-transparent hover:border-muted-foreground hover:bg-muted/30'
                        }`}
                        onClick={() => setSelectedVariantId(variant.id)}
                        title={`${variant.variantName} - ${variant.fullSetName} #${variant.cardNo}`}
                      >
                        <div className="flex flex-col items-center gap-2">
                          <CardImage size="w200" card={card} cardVariantId={variant.id} />
                          <div className="flex flex-col items-center">
                            <div className="text-xs font-medium text-center max-w-28 truncate">
                              {variant.variantName}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {variant.set?.toUpperCase()} #{variant.cardNo}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Right Column - Related Information */}
        <Card className="overflow-hidden">
          <CardContent className="pt-4 px-4">
            <div className="space-y-3">
              <div className="space-y-1">
                <h3 className="text-base font-semibold">Related Information</h3>
                <Separator className="my-1" />

                {/* Placeholder for decks containing this card */}
                <div className="py-2">
                  <h4 className="font-medium text-sm mb-2">Decks with this card:</h4>
                  <div className="text-sm text-muted-foreground">Not implemented yet.</div>
                </div>

                {/* Placeholder for collections containing this card */}
                <div className="py-2">
                  <h4 className="font-medium text-sm mb-2">Collections containing this card:</h4>
                  <div className="text-sm text-muted-foreground">Not implemented yet.</div>
                </div>

                {/* Actions buttons */}
                <div className="flex flex-col gap-2 mt-4">
                  <Button size="sm" className="w-full" disabled={true}>
                    Add to Collection
                  </Button>
                  <Button size="sm" variant="outline" className="w-full" disabled={true}>
                    Add to Wantlist
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

// Helper component for property rows
const PropertyRow: React.FC<{
  label: string;
  value: string | React.ReactNode;
}> = ({ label, value }) => {
  return (
    <div className="grid grid-cols-3 py-0.5 items-center text-sm">
      <div className="font-medium text-muted-foreground">{label}</div>
      <div className="col-span-2">{value}</div>
    </div>
  );
};

export default CardDetail;
