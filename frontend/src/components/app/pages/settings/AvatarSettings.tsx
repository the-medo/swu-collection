import { useState } from 'react';
import { useCardList } from '@/api/lists/useCardList.ts';
import { useSetUserAvatar } from '@/api/user/useSetUserAvatar.ts';
import { useUserAvatarSource } from '@/api/user/useUserAvatarSource.ts';
import { useUploadUserFile } from '@/api/user-files/useUploadUserFile.ts';
import { useUser } from '@/hooks/useUser.ts';
import { useToast } from '@/hooks/use-toast.ts';
import { Button } from '@/components/ui/button.tsx';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar.tsx';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs.tsx';
import CardSearchCommand from '@/components/app/global/CardSearchCommand/CardSearchCommand.tsx';
import { CardVariantPicker } from '@/components/app/cards/CardVariantPicker.tsx';
import { Link } from '@tanstack/react-router';
import { getCardImageUrl } from '@/components/app/global/cardImageLib.ts';
import { AvatarCropEditor } from './AvatarCropEditor.tsx';
import { UploadedImagePicker } from '@/components/app/global/UploadedImagePicker.tsx';
import type { CardVariant } from '../../../../../../lib/swu-resources/types.ts';
import type { AvatarCrop } from '../../../../../../types/UserAvatar.ts';
import type { UserFile } from '../../../../../../types/UserFile.ts';

export default function AvatarSettings() {
  const user = useUser();
  const catalog = useCardList();
  const mutation = useSetUserAvatar(user!.id);
  const upload = useUploadUserFile();
  const busy = mutation.isPending || upload.isPending;
  const sourceQuery = useUserAvatarSource(user!.id);
  const source = sourceQuery.data;
  const cardSource = source && 'cardId' in source ? source : null;
  const sourceCard = cardSource && catalog.data?.cards[cardSource.cardId];
  const sourceVariant = sourceCard && sourceCard.variants[cardSource!.variantId];
  const { toast } = useToast();
  const [cardId, setCardId] = useState('');
  const [variantId, setVariantId] = useState('');
  const [side, setSide] = useState<'front' | 'back'>('front');
  const [sourceType, setSourceType] = useState('cards');
  const [file, setFile] = useState<UserFile | null>(null);
  const [savedImage, setSavedImage] = useState<string>();
  const card = catalog.data?.cards[cardId];
  const variants = Object.values(card?.variants ?? {}).filter(
    (v): v is CardVariant => !!v?.image.front,
  );
  const variant = card?.variants[variantId];
  const src = file?.url ?? getCardImageUrl(variant?.image[side]);

  const reset = () => {
    setCardId('');
    setVariantId('');
    setSide('front');
    setFile(null);
    mutation.reset();
  };
  const save = async (crop: AvatarCrop) => {
    try {
      const result = await mutation.mutateAsync(
        file ? { fileId: file.id, crop } : { cardId, variantId, side, crop },
      );
      setSavedImage(result.image);
      reset();
      toast({ title: 'Avatar updated' });
    } catch {
      // Keep the crop and display the server error beside the save action.
    }
  };

  return (
    <section className="@container space-y-4 border-t pt-5" aria-labelledby="avatar-heading">
      <div className="flex items-center gap-4">
        <Avatar className="size-16">
          <AvatarImage src={savedImage ?? user?.image ?? undefined} alt="Current avatar" />
          <AvatarFallback>{user?.displayName?.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div className="space-y-1">
          <h3 id="avatar-heading" className="text-xl! font-medium">
            Avatar
          </h3>
          <p className="text-sm text-muted-foreground">
            Choose card artwork or one of your images, then crop it to make it yours.
          </p>
          {source && 'fileId' in source && (
            <p className="text-sm text-muted-foreground">Current artwork: Uploaded image</p>
          )}
          {cardSource && (
            <p className="text-sm text-muted-foreground">
              Current artwork:{' '}
              {sourceCard ? (
                <Link
                  to="."
                  search={previous => ({ ...previous, modalCardId: cardSource.cardId })}
                  className="text-primary underline"
                >
                  {sourceCard.name}
                </Link>
              ) : (
                'Card no longer available'
              )}
              {sourceVariant &&
                ` · ${sourceVariant.set.toUpperCase()} #${sourceVariant.cardNo} · ${sourceVariant.variantName}`}
              {cardSource.side === 'back' && ' · Back'}
            </p>
          )}
          {sourceQuery.isError && (
            <button
              type="button"
              className="text-sm text-destructive underline"
              onClick={() => void sourceQuery.refetch()}
            >
              Could not load avatar source. Retry
            </button>
          )}
        </div>
      </div>
      <Tabs
        value={sourceType}
        onValueChange={value => {
          setSourceType(value);
          reset();
        }}
      >
        <TabsList aria-label="Avatar image source">
          <TabsTrigger value="cards" disabled={busy}>
            Cards
          </TabsTrigger>
          <TabsTrigger value="images" disabled={busy}>
            Images
          </TabsTrigger>
        </TabsList>
        <TabsContent value="images">
          <UploadedImagePicker
            userId={user!.id}
            upload={upload}
            selectedId={file?.id}
            disabled={mutation.isPending}
            onSelect={selected => {
              setFile(selected);
              mutation.reset();
            }}
          />
        </TabsContent>
        <TabsContent value="cards">
          {catalog.isError ? (
            <div role="alert" className="space-y-2">
              <p>Could not load the card list.</p>
              <Button variant="outline" onClick={() => void catalog.refetch()}>
                Try again
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <p className="text-sm font-medium">Card</p>
              <CardSearchCommand
                id="card-search-avatar"
                label="Search avatar cards"
                disabled={mutation.isPending}
                onSelectCard={(id, defaultVariantId) => {
                  const selected = catalog.data?.cards[id];
                  const selectedVariant = selected?.variants[defaultVariantId]?.image.front
                    ? selected.variants[defaultVariantId]
                    : Object.values(selected?.variants ?? {}).find(v => v?.image.front);
                  if (!selectedVariant) {
                    toast({ variant: 'destructive', title: 'This card has no available artwork.' });
                    return;
                  }
                  setCardId(id);
                  setVariantId(selectedVariant.variantId);
                  setSide('front');
                  mutation.reset();
                }}
              />
              {card && (
                <>
                  <p className="text-sm">{card.name}</p>
                  <p className="text-sm font-medium">Version</p>
                  <CardVariantPicker
                    card={card}
                    variants={variants}
                    selectedVariantId={variantId}
                    disabled={mutation.isPending}
                    onSelect={id => {
                      setVariantId(id);
                      setSide('front');
                      mutation.reset();
                    }}
                  />
                  {variant?.image.back && (
                    <div className="flex gap-2" role="group" aria-label="Card side">
                      {(['front', 'back'] as const).map(value => (
                        <Button
                          key={value}
                          size="sm"
                          variant={side === value ? 'default' : 'outline'}
                          aria-pressed={side === value}
                          disabled={mutation.isPending}
                          onClick={() => {
                            setSide(value);
                            mutation.reset();
                          }}
                        >
                          {value === 'front' ? 'Front' : 'Back'}
                        </Button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
      {src && (file || card) && (
        <AvatarCropEditor
          key={file?.id ?? `${cardId}:${variantId}:${side}`}
          src={src}
          name={file?.fileName ?? card!.name}
          pending={mutation.isPending}
          disabled={upload.isPending}
          onSave={crop => void save(crop)}
          onCancel={reset}
        />
      )}
      {mutation.isError && (
        <p role="alert" className="text-sm text-destructive">
          {mutation.error.message}
        </p>
      )}
    </section>
  );
}
