import { dialogStyles } from '@/components/ui/dialogStyles';
import * as React from 'react';
import { useId } from 'react';
import DialogOption from '@/components/app/global/DialogOption.tsx';
import { useUser } from '@/hooks/useUser.ts';
import { useToast } from '@/hooks/use-toast.ts';
import { useForm } from '@tanstack/react-form';
import { Label } from '@/components/ui/label.tsx';
import { Input } from '@/components/ui/input.tsx';
import { Button } from '@/components/ui/button.tsx';
import { Checkbox } from '@/components/ui/checkbox.tsx';
import { Textarea } from '@/components/ui/textarea.tsx';
import { useNavigate } from '@tanstack/react-router';
import { usePostCollection } from '@/api/collections/usePostCollection.ts';
import { CollectionType } from '../../../../../types/enums.ts';
import { collectionTypeTitle } from '../../../../../types/iterableEnumInfo.ts';
import SignIn from '@/components/app/auth/SignIn.tsx';
import { useQueryClient } from '@tanstack/react-query';

export interface NewCollectionFormProps {
  collectionType: CollectionType;
  navigateAfterCreation?: boolean; // default true
  onCollectionCreated?: (newCollectionId: string) => void;
  onCancel?: () => void;
  defaultTitle?: string;
  defaultDescription?: string;
  disabled?: boolean;
  defaultPublic?: boolean;
  defaultForSale?: boolean;
  defaultForDecks?: boolean;
}

const NewCollectionForm: React.FC<NewCollectionFormProps> = ({
  collectionType,
  navigateAfterCreation = true,
  onCollectionCreated,
  onCancel,
  defaultTitle,
  defaultDescription,
  disabled = false,
  defaultPublic = false,
  defaultForSale = false,
  defaultForDecks = false,
}) => {
  const inputId = useId();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useUser();
  const { toast } = useToast();
  const cardListString = collectionTypeTitle[collectionType];
  const postCollectionMutation = usePostCollection();

  const form = useForm({
    defaultValues: {
      title: defaultTitle ?? `My ${cardListString}`,
      description: defaultDescription ?? ``,
      public: defaultPublic,
      forSale: defaultForSale,
      forDecks: defaultForDecks,
    },
    onSubmit: async ({ value }) => {
      if (disabled || postCollectionMutation.isPending) return;
      postCollectionMutation.mutate(
        {
          title: value.title,
          description: value.description,
          collectionType,
          public: value.public,
          ...(collectionType === CollectionType.COLLECTION
            ? { forSale: value.forSale, forDecks: value.forDecks }
            : { forSale: false, forDecks: false }),
        },
        {
          onSuccess: result => {
            toast({
              title: `${cardListString} "${value.title}" created!`,
            });
            const createdCollection = result.data[0];
            if (navigateAfterCreation) {
              navigate({ to: `/collections/${createdCollection.id}` });
            }
            onCollectionCreated?.(createdCollection.id);
            queryClient.invalidateQueries({ queryKey: ['user-collections-sync'] });
          },
        },
      );
    },
  });

  if (!user) {
    return (
      <div className="flex flex-col gap-4">
        Please sign in to create new {cardListString.toLowerCase()}.
        <SignIn />
      </div>
    );
  }

  return (
    <form
      className={dialogStyles.form}
      onSubmit={e => {
        e.preventDefault();
        e.stopPropagation();
        void form.handleSubmit();
      }}
    >
      <form.Field
        name="title"
        children={field => (
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${inputId}-${field.name}`}>Title</Label>
            <Input
              type="text"
              id={`${inputId}-${field.name}`}
              placeholder="Title"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={e => field.handleChange(e.target.value)}
              disabled={disabled}
            />
          </div>
        )}
      />
      <form.Field
        name="description"
        children={field => (
          <div className="flex flex-col gap-2">
            <Label htmlFor={`${inputId}-${field.name}`}>
              Description <span className="font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Textarea
              id={`${inputId}-${field.name}`}
              placeholder="Description"
              value={field.state.value}
              onBlur={field.handleBlur}
              onChange={e => field.handleChange(e.target.value)}
              disabled={disabled}
            />
          </div>
        )}
      />
      <form.Field
        name="public"
        children={field => (
          <DialogOption
            htmlFor={`${inputId}-public`}
            title="Public"
            description={`Let other players view this ${cardListString.toLowerCase()}.`}
          >
            <Checkbox
              id={`${inputId}-${field.name}`}
              checked={field.state.value}
              onBlur={field.handleBlur}
              onCheckedChange={e => field.handleChange(!!e)}
              disabled={disabled}
            />
          </DialogOption>
        )}
      />
      {collectionType === CollectionType.COLLECTION && (
        <>
          <form.Field
            name="forSale"
            children={field => (
              <DialogOption
                htmlFor={`${inputId}-forSale`}
                title="Available for sale"
                description="Show that cards in this collection are available for sale."
              >
                <Checkbox
                  id={`${inputId}-${field.name}`}
                  checked={field.state.value}
                  onBlur={field.handleBlur}
                  onCheckedChange={e => field.handleChange(!!e)}
                  disabled={disabled}
                />
              </DialogOption>
            )}
          />
          <form.Field
            name="forDecks"
            children={field => (
              <DialogOption
                htmlFor={`${inputId}-forDecks`}
                title="Use for deck building"
                description="Include these cards when checking what you own for your decks."
              >
                <Checkbox
                  id={`${inputId}-${field.name}`}
                  checked={field.state.value}
                  onBlur={field.handleBlur}
                  onCheckedChange={e => field.handleChange(!!e)}
                  disabled={disabled}
                />
              </DialogOption>
            )}
          />
        </>
      )}
      <div className={dialogStyles.formActions}>
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            disabled={postCollectionMutation.isPending}
            onClick={onCancel}
          >
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={postCollectionMutation.isPending || disabled}>
          {postCollectionMutation.isPending
            ? 'Creating...'
            : `Create ${cardListString.toLowerCase()}`}
        </Button>
      </div>
    </form>
  );
};

export default NewCollectionForm;
