import * as React from 'react';
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
  defaultTitle,
  defaultDescription,
  disabled = false,
  defaultPublic = false,
  defaultForSale = false,
  defaultForDecks = false,
}) => {
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
      if (disabled) return;
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
      className="flex flex-col gap-4"
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
            <Input
              type="text"
              className=""
              id={field.name}
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
            <Textarea
              className=""
              id={field.name}
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
          <div className="flex gap-2">
            <Checkbox
              id={field.name}
              checked={field.state.value}
              onBlur={field.handleBlur}
              onCheckedChange={e => field.handleChange(!!e)}
              disabled={disabled}
            />
            <Label htmlFor={field.name}>Public</Label>
          </div>
        )}
      />
      {collectionType === CollectionType.COLLECTION && (
        <>
          <form.Field
            name="forSale"
            children={field => (
              <div className="flex gap-2">
                <Checkbox
                  id={field.name}
                  checked={field.state.value}
                  onBlur={field.handleBlur}
                  onCheckedChange={e => field.handleChange(!!e)}
                  disabled={disabled}
                />
                <Label htmlFor={field.name}>For sale</Label>
              </div>
            )}
          />
          <form.Field
            name="forDecks"
            children={field => (
              <div className="flex gap-2">
                <Checkbox
                  id={field.name}
                  checked={field.state.value}
                  onBlur={field.handleBlur}
                  onCheckedChange={e => field.handleChange(!!e)}
                  disabled={disabled}
                />
                <Label htmlFor={field.name}>For decks</Label>
              </div>
            )}
          />
        </>
      )}
      <Button type="submit" disabled={form.state.isSubmitting || disabled}>
        {form.state.isSubmitting ? '...' : 'Create'}
      </Button>
    </form>
  );
};

export default NewCollectionForm;
