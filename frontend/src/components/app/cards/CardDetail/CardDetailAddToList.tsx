import { useEffect, useId, useRef, useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { Link } from '@tanstack/react-router';
import { useGetUserCollections } from '@/api/user/useGetUserCollections.ts';
import { usePostCollectionCard } from '@/api/collections/usePostCollectionCard.ts';
import SignIn from '@/components/app/auth/SignIn.tsx';
import AmountInput from '@/components/app/collections/CollectionInput/components/AmountInput.tsx';
import FoilSwitch from '@/components/app/collections/CollectionInput/components/FoilSwitch.tsx';
import NoteInput from '@/components/app/collections/CollectionInput/components/NoteInput.tsx';
import { getFoilBasedOnVariantAndSet } from '@/components/app/collections/CollectionInput/collectionInputLib.ts';
import CardLanguageSelect from '@/components/app/global/CardLanguageSelect.tsx';
import CardConditionSelect from '@/components/app/global/CardConditionSelect.tsx';
import FormFieldError from '@/components/app/global/FormFieldError.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Label } from '@/components/ui/label.tsx';
import CardDetailListSelect from './CardDetailListSelect.tsx';
import { useUser } from '@/hooks/useUser.ts';
import type { CardListVariants, CardVariant } from '../../../../../../lib/swu-resources/types.ts';
import { CardCondition, CardLanguage } from '../../../../../../types/enums.ts';
import { cardConditionArray } from '../../../../../../types/iterableEnumInfo.ts';

interface CardDetailAddToListProps {
  cardId: string;
  variant: CardVariant;
  variants: CardListVariants;
}

export default function CardDetailAddToList({
  cardId,
  variant,
  variants,
}: CardDetailAddToListProps) {
  const user = useUser();

  return (
    <section
      className="@container/add-to-list space-y-3 rounded-lg border bg-muted/20 p-3"
      aria-label="Add to list"
    >
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h3 className="shrink-0 !mb-0 !text-base font-semibold">Add to list</h3>
        <span className="min-w-0 flex-1 basis-48 text-xs leading-relaxed text-muted-foreground">
          The selected variant will be added:{' '}
          <span className="font-medium">{variant.variantName}</span>
          {' · '}
          {variant.set.toUpperCase()} #{variant.cardNo}.
        </span>
      </div>
      {user ? (
        <CardDetailAddToListForm
          key={`${user.id}:${cardId}`}
          userId={user.id}
          cardId={cardId}
          variant={variant}
          variants={variants}
        />
      ) : (
        <SignIn buttonText="Sign in to add cards" forceTextButton />
      )}
    </section>
  );
}

function CardDetailAddToListForm({
  userId,
  cardId,
  variant,
  variants,
}: CardDetailAddToListProps & { userId: string }) {
  const inputId = useId();
  const storageKey = `swubase:card-detail:last-list:${userId}`;
  const languageStorageKey = `swubase:card-detail:last-language:${userId}`;
  const [preferredLanguage, setPreferredLanguage] = useState(() => {
    try {
      const stored = localStorage.getItem(languageStorageKey);
      return Object.values(CardLanguage).find(language => language === stored) ?? CardLanguage.EN;
    } catch {
      return CardLanguage.EN;
    }
  });
  const [requestedCollectionId, setRequestedCollectionId] = useState(() => {
    try {
      return localStorage.getItem(storageKey) ?? '';
    } catch {
      return '';
    }
  });
  const { data, isPending, isError, isFetching, refetch } = useGetUserCollections(userId);
  const collections = (data?.collections ?? [])
    .filter(collection => collection.userId === userId)
    .sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }));
  const selectedCollectionId = collections.find(c => c.id === requestedCollectionId)?.id;
  const mutation = usePostCollectionCard(selectedCollectionId);
  const defaultFoil = getFoilBasedOnVariantAndSet(variant, false, variants);
  const previousDefaultFoil = useRef(defaultFoil);
  const form = useForm({
    defaultValues: {
      amount: 1 as number | undefined,
      foil: defaultFoil,
      condition: CardCondition.NM,
      language: preferredLanguage,
      note: '',
    },
    onSubmit: async ({ value }) => {
      if (!selectedCollectionId || !data || mutation.isPending || !value.amount) return;
      await mutation
        .mutateAsync({
          cardId,
          variantId: variant.variantId,
          foil: value.foil,
          condition:
            cardConditionArray.find(c => c.condition === value.condition)?.numericValue ?? 1,
          language: value.language,
          amount: value.amount,
          note: value.note.trim() || undefined,
        })
        .then(
          () => form.reset(),
          () => undefined, // The mutation displays the error; preserve the inputs for retry.
        );
    },
  });

  useEffect(() => {
    if (previousDefaultFoil.current === defaultFoil) return;
    previousDefaultFoil.current = defaultFoil;
    form.setFieldValue('foil', defaultFoil);
  }, [form, defaultFoil]);

  if (isPending) {
    return (
      <p className="text-sm text-muted-foreground" role="status">
        Loading your lists...
      </p>
    );
  }

  if (isError && !data) {
    return (
      <div className="space-y-2">
        <p className="text-sm text-destructive" role="alert">
          Unable to load your lists.
        </p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isFetching}
          onClick={() => void refetch()}
        >
          {isFetching ? 'Retrying...' : 'Retry'}
        </Button>
      </div>
    );
  }

  if (collections.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        You don’t have any lists yet. Create a{' '}
        <Link to="/collections/your" className="text-primary underline">
          collection
        </Link>
        ,{' '}
        <Link to="/wantlists/your" className="text-primary underline">
          wantlist
        </Link>{' '}
        or{' '}
        <Link to="/lists/your" className="text-primary underline">
          card list
        </Link>{' '}
        to start adding cards.
      </p>
    );
  }

  return (
    <form
      className="space-y-3 [&_input]:h-10 [&_label]:text-xs [&_label]:font-medium"
      onSubmit={event => {
        event.preventDefault();
        event.stopPropagation();
        if (!mutation.isPending) void form.handleSubmit();
      }}
    >
      {isError && (
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-muted-foreground" role="alert">
            Unable to refresh your lists.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={mutation.isPending || isFetching}
            onClick={() => void refetch()}
          >
            {isFetching ? 'Retrying...' : 'Retry'}
          </Button>
        </div>
      )}
      <div className="grid grid-cols-[5rem_minmax(0,1fr)] items-start gap-3">
        <form.Field
          name="amount"
          validators={{
            onChange: ({ value }) =>
              value === undefined || !Number.isInteger(value) || value < 1 || value > 1000
                ? 'Enter a whole number from 1 to 1000.'
                : undefined,
          }}
        >
          {field => (
            <div className="min-w-0 space-y-1">
              <AmountInput
                id={`${inputId}-amount`}
                value={field.state.value}
                onChange={field.handleChange}
                minValue={1}
                maxValue={1000}
                disabled={mutation.isPending}
              />
              <FormFieldError meta={field.state.meta} />
            </div>
          )}
        </form.Field>
        <div className="min-w-0 space-y-1">
          <Label htmlFor={`${inputId}-list`}>Destination list</Label>
          <CardDetailListSelect
            id={`${inputId}-list`}
            collections={collections}
            value={selectedCollectionId}
            disabled={mutation.isPending}
            onChange={id => {
              setRequestedCollectionId(id);
              try {
                localStorage.setItem(storageKey, id);
              } catch {
                // Adding cards still works when browser storage is unavailable.
              }
            }}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 items-end gap-3 @[400px]/add-to-list:grid-cols-[5.5rem_5rem_auto_minmax(7.5rem,1fr)]">
        <form.Field name="language">
          {field => (
            <div className="space-y-1">
              <Label htmlFor={`${inputId}-language`}>Language</Label>
              <div>
                <CardLanguageSelect
                  id={`${inputId}-language`}
                  value={field.state.value}
                  onChange={language => {
                    field.handleChange(language);
                    setPreferredLanguage(language);
                    try {
                      localStorage.setItem(languageStorageKey, language);
                    } catch {
                      // The current form still works when browser storage is unavailable.
                    }
                  }}
                  emptyOption={false}
                  showFullName
                  compact
                  disabled={mutation.isPending}
                />
              </div>
            </div>
          )}
        </form.Field>
        <form.Field name="condition">
          {field => (
            <div className="space-y-1">
              <Label htmlFor={`${inputId}-condition`}>Condition</Label>
              <div>
                <CardConditionSelect
                  id={`${inputId}-condition`}
                  value={field.state.value}
                  onChange={field.handleChange}
                  emptyOption={false}
                  showFullName
                  compact
                  disabled={mutation.isPending}
                />
              </div>
            </div>
          )}
        </form.Field>
        <form.Field name="foil">
          {field => (
            <div className="flex h-10 items-center">
              <FoilSwitch
                id={`${inputId}-foil`}
                value={field.state.value}
                onChange={field.handleChange}
                disabled={mutation.isPending}
              />
            </div>
          )}
        </form.Field>
        <form.Field name="note">
          {field => (
            <div className="space-y-1">
              <NoteInput
                id={`${inputId}-note`}
                value={field.state.value}
                onChange={field.handleChange}
                disabled={mutation.isPending}
              />
            </div>
          )}
        </form.Field>
      </div>
      <div className="flex justify-end">
        <form.Subscribe<boolean> selector={state => state.canSubmit}>
          {canSubmit => (
            <Button
              type="submit"
              size="sm"
              disabled={!selectedCollectionId || !canSubmit || mutation.isPending}
            >
              {mutation.isPending ? 'Adding...' : 'Add'}
            </Button>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
}
