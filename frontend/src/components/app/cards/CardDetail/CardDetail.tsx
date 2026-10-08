import * as React from 'react';
import { useCardList } from '@/api/lists/useCardList.ts';
import { useMemo, useState } from 'react';
import CardImage from '@/components/app/global/CardImage.tsx';
import { selectDefaultVariant } from '../../../../../../server/lib/cards/selectDefaultVariant.ts';
import { Badge } from '@/components/ui/badge.tsx';
import { Card, CardContent } from '@/components/ui/card.tsx';
import { Separator } from '@/components/ui/separator.tsx';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs.tsx';
import { Link } from '@tanstack/react-router';
import { Helmet } from 'react-helmet-async';
import { CardVariantPriceAdministration } from '../CardVariantPrice/CardVariantPriceAdministration';
import { PriceBadge } from '@/components/app/card-prices';
import { CardPriceSourceType } from '../../../../../../types/CardPrices.ts';
import PreviewCardBadge from '@/components/app/global/PreviewCardBadge.tsx';
import { CardVariantPicker } from '../CardVariantPicker.tsx';
import CardDetailAddToList from './CardDetailAddToList.tsx';
import CardDetailInLists from './CardDetailInLists.tsx';
import { useRole } from '@/hooks/useRole.ts';
import { cardDetailTabSchema, type CardDetailTab } from './cardDetailSearchParams.ts';

interface CardDetailProps {
  cardId: string;
  tab: CardDetailTab;
  variantId?: string;
  onTabChange: (tab: CardDetailTab) => void;
  onVariantChange: (variantId: string) => void;
}

const CardDetail: React.FC<CardDetailProps> = ({
  cardId,
  tab,
  variantId,
  onTabChange,
  onVariantChange,
}) => {
  const hasRole = useRole();
  const { data: cardList, isFetching: isFetchingCardList } = useCardList();

  const card = useMemo(() => {
    if (!cardList) return undefined;
    return cardList.cards[cardId];
  }, [cardList, cardId]);

  // Default variant as initial state
  const defaultVariantId = useMemo(() => {
    return card ? selectDefaultVariant(card) : undefined;
  }, [card]);

  const [visitedVariantsCardId, setVisitedVariantsCardId] = useState<string | undefined>();
  const activeVariantId = variantId && card?.variants[variantId] ? variantId : defaultVariantId;

  // Retain the lazy form after Variants opens, including through URL/history navigation.
  if (tab === 'variants' && visitedVariantsCardId !== cardId) {
    setVisitedVariantsCardId(cardId);
  }

  // Get the current variant object based on selected id
  const selectedVariant = useMemo(() => {
    if (!card) return undefined;
    return activeVariantId ? card.variants[activeVariantId] : undefined;
  }, [card, activeVariantId]);

  // Get all variants for the card
  const allVariants = useMemo(() => {
    if (!card) return [];
    return Object.entries(card.variants).flatMap(([variantId, variantData]) =>
      variantData ? [{ id: variantId, ...variantData }] : [],
    );
  }, [card]);

  if (!card) {
    return (
      <>
        <Helmet title={`Card not found | SWUBase`} />
        <div className="flex flex-col gap-4">
          <h2>Card not found: {cardId}</h2>
          {isFetchingCardList && <p>Loading card data...</p>}
        </div>
      </>
    );
  }

  return (
    <>
      <Helmet title={`${card.name} | SWUBase`} />
      <div className="@container/card-detail flex flex-col gap-4 p-2">
        <Link
          to="/cards/detail/$cardId"
          params={{ cardId }}
          search={previous => ({
            formatId: previous.formatId,
            metaId: previous.metaId,
            deckFormat: previous.deckFormat,
            cardTab: tab === 'details' ? undefined : tab,
            cardVariantId: activeVariantId,
          })}
        >
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold">{card.name}</h2>
            {card.preview && <PreviewCardBadge size="default" />}
          </div>
        </Link>

        <div className="grid grid-cols-1 gap-4 @[720px]/card-detail:grid-cols-[300px_minmax(0,1fr)] @[1100px]/card-detail:grid-cols-[350px_minmax(0,1fr)]">
          {/* Left Column - Card Image and Variant Info */}
          <div className="flex flex-col gap-3">
            <div className="flex justify-center">
              <CardImage size="w300" card={card} cardVariantId={activeVariantId} />
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
                  </div>
                  <Separator className="my-1" />
                  <div
                    className="text-xs text-muted-foreground text-center cursor-pointer hover:text-foreground transition-colors"
                    onClick={() => navigator.clipboard.writeText(card.cardId)}
                    title="Click to copy card ID"
                  >
                    ID: {card.cardId}
                  </div>
                  {selectedVariant && (
                    <div
                      className="text-[10px] text-muted-foreground text-center cursor-pointer hover:text-foreground transition-colors"
                      onClick={() => navigator.clipboard.writeText(selectedVariant.variantId)}
                      title="Click to copy card variant ID"
                    >
                      ID: {selectedVariant.variantId}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Main Content - Card Details with Tabs */}
          <Card className="min-w-0 overflow-hidden">
            <CardContent className="pt-4 px-4">
              <Tabs
                key={cardId}
                value={tab}
                className="w-full"
                onValueChange={value => {
                  onTabChange(cardDetailTabSchema.parse(value));
                }}
              >
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
                    {card.preview && <PropertyRow label="Status" value={<PreviewCardBadge />} />}
                    {card.preview && card.karabast_id?.trim() && (
                      <PropertyRow label="Karabast ID" value={card.karabast_id} />
                    )}
                    <PropertyRow label="Rarity" value={card.rarity} />
                    {card.cost !== null && (
                      <PropertyRow label="Cost" value={card.cost.toString()} />
                    )}
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
                <TabsContent
                  value="variants"
                  forceMount
                  className="mt-0 data-[state=inactive]:hidden"
                >
                  {(tab === 'variants' || visitedVariantsCardId === cardId) && (
                    <div className="space-y-3">
                      <CardVariantPicker
                        card={card}
                        variants={allVariants}
                        selectedVariantId={activeVariantId}
                        onSelect={onVariantChange}
                        showBackSide
                        renderDetails={variant => (
                          <>
                            <PriceBadge
                              cardId={cardId}
                              sourceType={CardPriceSourceType.CARDMARKET}
                              variantId={variant.variantId}
                            />
                            <PriceBadge
                              cardId={cardId}
                              sourceType={CardPriceSourceType.TCGPLAYER}
                              variantId={variant.variantId}
                            />
                          </>
                        )}
                      />
                      {selectedVariant && (
                        <CardDetailAddToList
                          cardId={cardId}
                          variant={selectedVariant}
                          variants={card.variants}
                        />
                      )}
                      <CardDetailInLists card={card} selectedVariantId={activeVariantId} />
                      {hasRole('admin') && activeVariantId && (
                        <CardVariantPriceAdministration
                          cardId={cardId}
                          variantId={activeVariantId}
                        />
                      )}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
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
